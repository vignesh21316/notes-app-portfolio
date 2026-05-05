const STORAGE_KEY = "notecraft-notes";
const LEGACY_STORAGE_KEY = "notes";

const state = {
    notes: [],
    searchTerm: "",
    filter: "all",
    sort: "newest"
};

const elements = {};

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
    cacheElements();
    bindEvents();
    state.notes = loadNotes();
    updateFilterButtons();
    updateCharacterCount();
    render();
}

function cacheElements() {
    elements.form = document.getElementById("noteForm");
    elements.noteId = document.getElementById("noteId");
    elements.titleInput = document.getElementById("titleInput");
    elements.noteInput = document.getElementById("noteInput");
    elements.colorInput = document.getElementById("colorInput");
    elements.searchInput = document.getElementById("searchInput");
    elements.sortSelect = document.getElementById("sortSelect");
    elements.notesGrid = document.getElementById("notesGrid");
    elements.charCount = document.getElementById("charCount");
    elements.statusMessage = document.getElementById("statusMessage");
    elements.totalNotes = document.getElementById("totalNotes");
    elements.pinnedNotes = document.getElementById("pinnedNotes");
    elements.wordCount = document.getElementById("wordCount");
    elements.resultsSummary = document.getElementById("resultsSummary");
    elements.formHeading = document.getElementById("formHeading");
    elements.saveButton = document.getElementById("saveBtn");
    elements.clearFormButton = document.getElementById("clearFormBtn");
    elements.filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
}

function bindEvents() {
    elements.form.addEventListener("submit", handleFormSubmit);
    elements.noteInput.addEventListener("input", handleNoteInput);
    elements.titleInput.addEventListener("input", clearStatusMessage);
    elements.searchInput.addEventListener("input", handleSearch);
    elements.sortSelect.addEventListener("change", handleSortChange);
    elements.clearFormButton.addEventListener("click", () => resetForm());
    elements.notesGrid.addEventListener("click", handleNoteActions);

    elements.filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.filter = button.dataset.filter;
            updateFilterButtons();
            render();
        });
    });

    document.addEventListener("keydown", (event) => {
        const isSaveShortcut = event.ctrlKey && event.key === "Enter";
        if (isSaveShortcut && document.activeElement === elements.noteInput) {
            event.preventDefault();
            elements.form.requestSubmit();
        }
    });
}

function handleNoteInput() {
    updateCharacterCount();
    clearStatusMessage();
}

function handleFormSubmit(event) {
    event.preventDefault();

    const title = elements.titleInput.value.trim();
    const content = elements.noteInput.value.trim();
    const color = elements.colorInput.value;
    const noteId = elements.noteId.value;

    if (!title && !content) {
        setStatusMessage("Add a title or note content before saving.");
        elements.noteInput.focus();
        return;
    }

    const finalTitle = title || deriveTitleFromContent(content);
    const now = new Date().toISOString();

    if (noteId) {
        state.notes = state.notes.map((note) =>
            note.id === noteId
                ? {
                    ...note,
                    title: finalTitle,
                    content,
                    color,
                    updatedAt: now
                }
                : note
        );
        setStatusMessage("Note updated successfully.");
    } else {
        state.notes.unshift({
            id: createNoteId(),
            title: finalTitle,
            content,
            color,
            pinned: false,
            createdAt: now,
            updatedAt: now
        });
        setStatusMessage("Note saved successfully.");
    }

    persistNotes();
    resetForm(false);
    render();
}

function handleSearch(event) {
    state.searchTerm = event.target.value.trim().toLowerCase();
    render();
}

function handleSortChange(event) {
    state.sort = event.target.value;
    render();
}

function handleNoteActions(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
        return;
    }

    const noteCard = event.target.closest(".note-card");
    const noteId = noteCard?.dataset.id;
    if (!noteId) {
        return;
    }

    const action = actionButton.dataset.action;

    if (action === "edit") {
        populateFormForEdit(noteId);
    } else if (action === "pin") {
        togglePin(noteId);
    } else if (action === "copy") {
        copyNote(noteId);
    } else if (action === "delete") {
        deleteNote(noteId);
    }
}

function loadNotes() {
    try {
        const storedNotes = localStorage.getItem(STORAGE_KEY);
        if (storedNotes) {
            return normalizeNotes(JSON.parse(storedNotes));
        }

        const legacyNotes = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!legacyNotes) {
            return [];
        }

        const migratedNotes = normalizeNotes(JSON.parse(legacyNotes));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedNotes));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migratedNotes;
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
}

function normalizeNotes(notes) {
    if (!Array.isArray(notes)) {
        return [];
    }

    return notes.map((note, index) => {
        if (typeof note === "string") {
            const timestamp = new Date(Date.now() - index * 60000).toISOString();
            return {
                id: createNoteId(index),
                title: deriveTitleFromContent(note),
                content: note,
                color: "sunset",
                pinned: false,
                createdAt: timestamp,
                updatedAt: timestamp
            };
        }

        const safeContent = typeof note.content === "string" ? note.content : "";
        return {
            id: note.id || createNoteId(index),
            title: note.title?.trim() || deriveTitleFromContent(safeContent),
            content: safeContent,
            color: note.color || "sunset",
            pinned: Boolean(note.pinned),
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || note.createdAt || new Date().toISOString()
        };
    });
}

function persistNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function resetForm(clearMessage = true) {
    elements.form.reset();
    elements.noteId.value = "";
    elements.colorInput.value = "sunset";
    elements.formHeading.textContent = "Capture your next idea";
    elements.saveButton.textContent = "Save note";
    updateCharacterCount();

    if (clearMessage) {
        setStatusMessage("Ready when you are.");
    }
}

function populateFormForEdit(noteId) {
    const note = state.notes.find((entry) => entry.id === noteId);
    if (!note) {
        return;
    }

    elements.noteId.value = note.id;
    elements.titleInput.value = note.title;
    elements.noteInput.value = note.content;
    elements.colorInput.value = note.color;
    elements.formHeading.textContent = "Refine this note";
    elements.saveButton.textContent = "Update note";
    updateCharacterCount();
    setStatusMessage("Editing mode enabled.");
    elements.titleInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function togglePin(noteId) {
    state.notes = state.notes.map((note) =>
        note.id === noteId
            ? { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() }
            : note
    );

    persistNotes();
    setStatusMessage("Note priority updated.");
    render();
}

function deleteNote(noteId) {
    const note = state.notes.find((entry) => entry.id === noteId);
    if (!note) {
        return;
    }

    const confirmed = window.confirm(`Delete "${note.title}"?`);
    if (!confirmed) {
        return;
    }

    state.notes = state.notes.filter((entry) => entry.id !== noteId);
    persistNotes();

    if (elements.noteId.value === noteId) {
        resetForm(false);
    }

    setStatusMessage("Note deleted.");
    render();
}

async function copyNote(noteId) {
    const note = state.notes.find((entry) => entry.id === noteId);
    if (!note) {
        return;
    }

    const textToCopy = `${note.title}\n\n${note.content}`.trim();

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
        } else {
            fallbackCopy(textToCopy);
        }
        setStatusMessage("Note copied to clipboard.");
    } catch (error) {
        setStatusMessage("Copy failed in this browser context.");
    }
}

function fallbackCopy(text) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    document.body.removeChild(helper);
}

function getFilteredNotes() {
    const filtered = state.notes.filter((note) => {
        const matchesSearch = `${note.title} ${note.content}`.toLowerCase().includes(state.searchTerm);
        const matchesFilter =
            state.filter === "all" ||
            (state.filter === "pinned" && note.pinned) ||
            (state.filter === "today" && isUpdatedToday(note.updatedAt));

        return matchesSearch && matchesFilter;
    });

    return filtered.sort((first, second) => {
        if (first.pinned !== second.pinned) {
            return first.pinned ? -1 : 1;
        }

        if (state.sort === "oldest") {
            return new Date(first.updatedAt) - new Date(second.updatedAt);
        }

        if (state.sort === "alphabetical") {
            return first.title.localeCompare(second.title);
        }

        return new Date(second.updatedAt) - new Date(first.updatedAt);
    });
}

function render() {
    const filteredNotes = getFilteredNotes();
    renderStats();
    renderSummary(filteredNotes.length);
    renderNotes(filteredNotes);
}

function renderStats() {
    const totalNotes = state.notes.length;
    const pinnedNotes = state.notes.filter((note) => note.pinned).length;
    const wordCount = state.notes.reduce((sum, note) => sum + countWords(note.content), 0);

    elements.totalNotes.textContent = totalNotes;
    elements.pinnedNotes.textContent = pinnedNotes;
    elements.wordCount.textContent = wordCount;
}

function renderSummary(visibleCount) {
    if (!state.notes.length) {
        elements.resultsSummary.textContent = "No notes yet. Create the first one above.";
        return;
    }

    const filterLabel =
        state.filter === "all"
            ? "all notes"
            : state.filter === "pinned"
                ? "pinned notes"
                : "notes updated today";

    elements.resultsSummary.textContent = `Showing ${visibleCount} ${filterLabel}.`;
}

function renderNotes(notes) {
    if (!state.notes.length) {
        elements.notesGrid.innerHTML = `
            <article class="empty-state">
                <h3>Start your notes collection</h3>
                <p>Create a note to see live search, pinned cards, and saved browser storage in action.</p>
            </article>
        `;
        return;
    }

    if (!notes.length) {
        elements.notesGrid.innerHTML = `
            <article class="empty-state">
                <h3>No matches found</h3>
                <p>Try a different search term or switch to another filter.</p>
            </article>
        `;
        return;
    }

    elements.notesGrid.innerHTML = notes
        .map((note) => {
            const badgeLabel = note.pinned ? "Pinned" : "Saved";
            const contentPreview = formatNoteContent(note.content);

            return `
                <article class="note-card" data-id="${note.id}" data-color="${note.color}">
                    <div class="note-card__header">
                        <span class="note-badge">${badgeLabel}</span>
                        <div class="note-actions">
                            <button class="note-action" type="button" data-action="pin">
                                ${note.pinned ? "Unpin" : "Pin"}
                            </button>
                            <button class="note-action" type="button" data-action="edit">Edit</button>
                            <button class="note-action" type="button" data-action="copy">Copy</button>
                            <button class="note-action" type="button" data-action="delete">Delete</button>
                        </div>
                    </div>
                    <h3>${escapeHtml(note.title)}</h3>
                    <p class="note-content">${contentPreview}</p>
                    <div class="note-footer">
                        <div class="note-meta">
                            <span>Updated ${formatDate(note.updatedAt)}</span>
                            <span>${countWords(note.content)} words</span>
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");
}

function updateFilterButtons() {
    elements.filterButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.filter === state.filter);
    });
}

function updateCharacterCount() {
    const length = elements.noteInput.value.length;
    elements.charCount.textContent = `${length} / 600 characters`;
}

function setStatusMessage(message) {
    elements.statusMessage.textContent = message;
}

function clearStatusMessage() {
    if (elements.statusMessage.textContent === "Add a title or note content before saving.") {
        setStatusMessage("Ready when you are.");
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatNoteContent(content) {
    return escapeHtml(content || "No extra details added.").replace(/\n/g, "<br>");
}

function deriveTitleFromContent(content) {
    const fallback = content.split("\n")[0]?.trim() || "Untitled note";
    return fallback.slice(0, 40);
}

function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) {
        return 0;
    }

    return trimmed.split(/\s+/).length;
}

function isUpdatedToday(dateString) {
    const today = new Date();
    const updated = new Date(dateString);

    return (
        today.getFullYear() === updated.getFullYear() &&
        today.getMonth() === updated.getMonth() &&
        today.getDate() === updated.getDate()
    );
}

function createNoteId(seed = 0) {
    return `note-${Date.now()}-${Math.random().toString(16).slice(2)}-${seed}`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
