import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';

// ========================================
// BOT TOKEN
// ========================================

const TOKEN = '8703531186:AAFBHemmF4ftNKpXWZOeWinCeNOTTw_n-J0';

const bot = new Telegraf(TOKEN);

// Admin username (@ belgisisiz)
const ADMIN_USERNAME = 'dr_ulugbekovv1';

const MAX_TEAMS = 25;

const DB_FILE = 'db.json';

// Turnir joylashuvi
const TOURNAMENT_LOCATION =
    'https://maps.app.goo.gl/B71hgEW9wt6R69Rp7';

// ========================================
// DATABASE
// ========================================

function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify({ teams: [] }, null, 2)
        );
    }
}

initDB();

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        initDB();
    }

    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');

        const parsed = JSON.parse(data);

        if (!parsed.teams) {
            parsed.teams = [];
        }

        return parsed;

    } catch (error) {
        return {
            teams: []
        };
    }
}

function writeDB(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );
}

// ========================================
// USER STATES
// ========================================

const userStates = {};

// ========================================
// ADMIN TEKSHIRISH
// ========================================

function isAdmin(ctx) {

    const username = ctx.from?.username;

    if (!username) {
        return false;
    }

    return (
        username.toLowerCase() ===
        ADMIN_USERNAME.toLowerCase()
    );
}

// ========================================
// /START
// ========================================

bot.start((ctx) => {

    const chatId = ctx.chat.id;

    const db = readDB();

    const existingTeam = db.teams.find(
        team => team.chatId === chatId
    );

    // Oldin ro'yxatdan o'tgan bo'lsa
    if (existingTeam) {
        return showTeamMenu(
            ctx,
            existingTeam
        );
    }

    // Admin bo'lsa
    if (isAdmin(ctx)) {
        return showAdminMenu(ctx);
    }

    // Yangi ro'yxatdan o'tish
    userStates[chatId] = {
        step: 'waiting_for_team_name'
    };

    return ctx.reply(
        `🎮 Turnirga xush kelibsiz!\n\n` +
        `Iltimos, jamoangiz nomini kiriting ` +
        `(Bu nom yagona bo'lishi kerak):`,
        Markup.removeKeyboard()
    );
});

// ========================================
// TELEFON RAQAMI
// ========================================

bot.on('contact', (ctx) => {

    const chatId = ctx.chat.id;

    const contact = ctx.message.contact;

    const state = userStates[chatId];

    if (
        state &&
        state.step === 'waiting_for_phone'
    ) {

        state.phone = contact.phone_number;

        state.step = 'waiting_for_school';

        return ctx.reply(
            `Ajoyib! Endi Maktabingizni kiriting ` +
            `(Masalan: 15-maktab):`,
            Markup.removeKeyboard()
        );
    }
});

// ========================================
// MATNLI XABARLAR
// ========================================

bot.on('text', (ctx) => {

    const chatId = ctx.chat.id;

    const text = ctx.message.text;

    const db = readDB();

    const state = userStates[chatId];

    if (!db.teams) {
        db.teams = [];
    }

    // Command bo'lsa
    if (text.startsWith('/')) {
        return;
    }

    // ========================================
    // ADMIN PANEL
    // ========================================

    if (isAdmin(ctx)) {

        // ====================================
        // STATISTIKA
        // ====================================

        if (
            text ===
            '📊 Statistika va Jamoalar'
        ) {

            const totalTeams =
                db.teams.length;

            let msg =
                `📊 Turnir Statistikasi: ` +
                `${totalTeams}/${MAX_TEAMS} ` +
                `jamoa ro'yxatdan o'tgan.\n\n`;

            if (totalTeams === 0) {

                msg +=
                    `Hozircha jamoalar yo'q.`;

            } else {

                db.teams.forEach(
                    (team, index) => {

                        msg +=
                            `${index + 1}. 🛡 ` +
                            `Jamoa: ${team.teamName}\n`;

                        msg +=
                            `   👤 Sardor: ` +
                            `${team.fullName}\n`;

                        msg +=
                            `   🏫 Maktab: ` +
                            `${team.school}\n`;

                        msg +=
                            `   📞 Tel: ` +
                            `${team.phone}\n`;

                        // Username
                        if (team.username) {

                            msg +=
                                `   👤 Username: @` +
                                `${team.username}\n`;

                        } else {

                            msg +=
                                `   👤 Username: ` +
                                `mavjud emas\n`;
                        }

                        msg += `\n`;
                    }
                );
            }

            // Markdown ishlatilmaydi.
            // Shuning uchun _ yoki * belgilaridan
            // Telegram xato bermaydi.

            return ctx.reply(msg);
        }

        // ====================================
        // USER REJIMIGA O'TISH
        // ====================================

        if (
            text ===
            "👤 User rejimiga o'tish"
        ) {

            const team = db.teams.find(
                t => t.chatId === chatId
            );

            if (team) {

                return showTeamMenu(
                    ctx,
                    team
                );

            } else {

                return ctx.reply(
                    `Siz hali jamoa ochmagansiz.\n\n` +
                    `Jamoa ochish uchun /start ni bosing.`
                );
            }
        }
    }

    // ========================================
    // JAMOA NOMI
    // ========================================

    if (
        state &&
        state.step ===
        'waiting_for_team_name'
    ) {

        const teamName =
            text.trim();

        // 25 ta jamoa limiti
        if (
            db.teams.length >=
            MAX_TEAMS
        ) {

            delete userStates[chatId];

            return ctx.reply(
                `❌ Kechirasiz, turnir uchun ` +
                `25 ta jamoa limiti to'ldi!`
            );
        }

        // Jamoa nomi bandligini tekshirish
        const exists =
            db.teams.some(
                team =>
                    team.teamName.toLowerCase() ===
                    teamName.toLowerCase()
            );

        if (exists) {

            return ctx.reply(
                `❌ "${teamName}" jamoasi nomi ` +
                `allaqachon band qilingan!\n\n` +
                `Iltimos, boshqa noyob nom kiriting:`
            );
        }

        state.teamName =
            teamName;

        state.step =
            'waiting_for_name';

        return ctx.reply(
            `Ajoyib! Endi sardorning ` +
            `Ism va Familiyasini kiriting.\n\n` +
            `Masalan: Alisher Valiyev:`,
            Markup.removeKeyboard()
        );
    }

    // ========================================
    // ISM VA FAMILIYA
    // ========================================

    if (
        state &&
        state.step ===
        'waiting_for_name'
    ) {

        state.fullName =
            text.trim();

        state.step =
            'waiting_for_phone';

        return ctx.reply(
            `Rahmat, ${state.fullName}.\n\n` +
            `Endi pastdagi tugmani bosib ` +
            `o'z telefon raqamingizni yuboring:`,
            Markup.keyboard([
                [
                    Markup.button.contactRequest(
                        '📱 Telefon raqamni yuborish'
                    )
                ]
            ])
            .resize()
            .oneTime()
        );
    }

    // ========================================
    // MAKTAB VA JAMOANI SAQLASH
    // ========================================

    if (
        state &&
        state.step ===
        'waiting_for_school'
    ) {

        state.school =
            text.trim();

        // Telegram username
        const username =
            ctx.from?.username || null;

        const newTeam = {

            chatId: chatId,

            username: username,

            teamName: state.teamName,

            fullName: state.fullName,

            phone: state.phone,

            school: state.school,

            createdAt:
                new Date().toISOString()
        };

        db.teams.push(
            newTeam
        );

        writeDB(db);

        delete userStates[chatId];

        const totalTeams =
            db.teams.length;

        let successMsg =
            `🎉 Tabriklayman!\n\n` +
            `"${state.teamName}" jamoasi ` +
            `muvaffaqiyatli ro'yxatdan o'tdi!\n\n`;

        successMsg +=
            `📊 Jamoalar holati: ` +
            `${totalTeams}/${MAX_TEAMS} ta ` +
            `jamoa ro'yxatdan o'tdi.\n\n`;

        successMsg +=
            `👥 Sardor ma'lumotlari:\n`;

        successMsg +=
            `• Ism: ${state.fullName}\n`;

        successMsg +=
            `• Maktab: ${state.school}\n\n`;

        successMsg +=
            `💰 To'lov:\n`;

        successMsg +=
            `100 000 so'm — 1 ta jamoa uchun\n`;

        successMsg +=
            `25 000 so'm × 4 kishi\n\n`;

        successMsg +=
            `📅 Turnir vaqti: ` +
            `17 oktyabr 13:00\n\n`;

        successMsg +=
            `📍 Turnir joyi: MBSI AI school`;

        return ctx.reply(
            successMsg,
            Markup.keyboard([
                [
                    '🛡 Mening jamoam',
                    "🚪 Jamoani o'chirish"
                ],
                [
                    '📍 Turnir joylashuvi'
                ]
            ])
            .resize()
        );
    }

    // ========================================
    // JAMOA BORLIGINI TEKSHIRISH
    // ========================================

    const team =
        db.teams.find(
            t => t.chatId === chatId
        );

    if (!team) {

        if (isAdmin(ctx)) {
            return;
        }

        return ctx.reply(
            `Iltimos, ro'yxatdan o'tish uchun ` +
            `/start ni bosing.`
        );
    }

    // ========================================
    // MENING JAMOAM
    // ========================================

    if (
        text ===
        '🛡 Mening jamoam'
    ) {

        const totalTeams =
            db.teams.length;

        let info =
            `🛡 Jamoa nomi: ` +
            `${team.teamName}\n`;

        info +=
            `📊 Turnir jamoalari: ` +
            `${totalTeams}/${MAX_TEAMS} ta\n\n`;

        info +=
            `👤 Sardor: ` +
            `${team.fullName}\n`;

        info +=
            `🏫 Maktab: ` +
            `${team.school}\n\n`;

        info +=
            `⚠️ Eslatma:\n` +
            `Turnir kuni 4 ta o'yinchi ` +
            `bo'lib kelishingiz shart!\n\n`;

        info +=
            `💰 To'lov:\n`;

        info +=
            `100 000 so'm — 1 ta jamoa uchun\n`;

        info +=
            `25 000 so'm × 4 kishi\n\n`;

        info +=
            `📅 Turnir vaqti: ` +
            `17 oktyabr 13:00\n\n`;

        info +=
            `📍 Turnir joyi: ` +
            `MBSI AI school`;

        return ctx.reply(info);
    }

    // ========================================
    // TURNIR JOYLASHUVI
    // ========================================

    if (
        text ===
        '📍 Turnir joylashuvi'
    ) {

        return ctx.reply(
            `📍 Turnir o'tkaziladigan joy:\n\n` +
            `🏫 MBSI AI school\n\n` +
            `Xaritadan joylashuvni ko'rish uchun ` +
            `pastdagi tugmani bosing:`,
            Markup.inlineKeyboard([
                [
                    Markup.button.url(
                        '📍 Google Mapsda ochish',
                        TOURNAMENT_LOCATION
                    )
                ]
            ])
        );
    }

    // ========================================
    // JAMOANI O'CHIRISH
    // ========================================

    if (
        text ===
        "🚪 Jamoani o'chirish"
    ) {

        db.teams =
            db.teams.filter(
                t =>
                    t.chatId !== chatId
            );

        writeDB(db);

        delete userStates[chatId];

        if (isAdmin(ctx)) {

            return showAdminMenu(ctx);

        } else {

            return ctx.reply(
                `Jamoangiz o'chirildi. 🚪\n\n` +
                `Yangi jamoa ochish uchun ` +
                `/start ni bosing.`,
                Markup.removeKeyboard()
            );
        }
    }
});

// ========================================
// JAMOA MENYUSI
// ========================================

function showTeamMenu(
    ctx,
    team
) {

    const db =
        readDB();

    const totalTeams =
        db.teams.length;

    let msg =
        `Siz "${team.teamName}" ` +
        `jamoasining sardorisiz.\n\n`;

    msg +=
        `📊 Jamoalar: ` +
        `${totalTeams}/${MAX_TEAMS}\n\n`;

    msg +=
        `💰 To'lov:\n`;

    msg +=
        `100 000 so'm — 1 ta jamoa uchun\n`;

    msg +=
        `25 000 so'm × 4 kishi\n\n`;

    msg +=
        `📅 Turnir vaqti: ` +
        `17 oktyabr 13:00\n\n`;

    msg +=
        `📍 Turnir joyi: ` +
        `MBSI AI school`;

    const keyboard = [
        [
            '🛡 Mening jamoam',
            "🚪 Jamoani o'chirish"
        ],
        [
            '📍 Turnir joylashuvi'
        ]
    ];

    // Admin uchun
    if (isAdmin(ctx)) {

        keyboard.push([
            '👑 Admin Panelga o\'tish'
        ]);
    }

    return ctx.reply(
        msg,
        Markup.keyboard(
            keyboard
        ).resize()
    );
}

// ========================================
// ADMIN MENU
// ========================================

function showAdminMenu(ctx) {

    return ctx.reply(
        `👑 Xush kelibsiz, Admin!\n\n` +
        `Siz admin panelidasiz:`,
        Markup.keyboard([
            [
                '📊 Statistika va Jamoalar'
            ],
            [
                "👤 User rejimiga o'tish"
            ]
        ])
        .resize()
    );
}

// ========================================
// ADMIN PANELGA O'TISH
// ========================================

bot.hears(
    '👑 Admin Panelga o\'tish',
    (ctx) => {

        if (isAdmin(ctx)) {

            return showAdminMenu(ctx);
        }
    }
);

// ========================================
// XATOLARNI USHLASH
// ========================================

bot.catch(
    (error, ctx) => {

        console.error(
            'Botda xato:',
            error
        );

        try {

            ctx.reply(
                `❌ Xatolik yuz berdi.\n` +
                `Iltimos, qaytadan urinib ko'ring.`
            );

        } catch (e) {

            console.error(e);
        }
    }
);

// ========================================
// BOTNI ISHGA TUSHIRISH
// ========================================

bot.launch()
    .then(() => {

        console.log(
            '✅ Bot muvaffaqiyatli ishga tushdi...'
        );

    })
    .catch(error => {

        console.error(
            '❌ Botni ishga tushirishda xato:',
            error
        );

    });

// ========================================
// BOTNI TO'XTATISH
// ========================================

process.once(
    'SIGINT',
    () => bot.stop('SIGINT')
);

process.once(
    'SIGTERM',
    () => bot.stop('SIGTERM')
);