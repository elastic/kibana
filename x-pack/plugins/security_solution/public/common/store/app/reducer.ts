/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import type { Note } from '../../lib/note';

import {
  addError,
  addErrorHash,
  addNotes,
  removeError,
  updateNote,
  deleteNote,
  fetchNotesByDocumentRequest,
  fetchNotesByDocumentSuccess,
  fetchNotesBySavedObjectSuccess,
  fetchNotesBySavedObjectFailure,
  fetchNotesBySavedObjectRequest,
  createNoteForDocumentRequest,
  createNoteForDocumentSuccess,
  createNoteForDocumentFailure,
  createNoteForTimelineRequest,
  createNoteForTimelineSuccess,
  createNoteForTimelineFailure,
  createNoteForDocumentAndTimelineRequest,
  createNoteForDocumentAndTimelineSuccess,
  createNoteForDocumentAndTimelineFailure,
  deleteNoteRequest,
  deleteNoteSuccess,
  deleteNoteFailure,
  fetchNotesByDocumentsRequest,
  fetchNotesByDocumentsSuccess,
  fetchNotesByDocumentsFailure,
} from './actions';
import type { AppModel, NotesById } from './model';
import { allowedExperimentalValues } from '../../../../common/experimental_features';

export type AppState = AppModel;

export const initialAppState: AppState = {
  byId: {},
  allIds: [],
  idsByDocumentId: {},
  idsBySavedObjectId: {},
  loadingFetchByDocument: false,
  errorFetchByDocument: false,
  loadingFetchBySavedObject: false,
  errorFetchBySavedObject: false,
  loadingCreateForDocument: false,
  errorCreateForDocument: false,
  loadingCreateForSavedObject: false,
  errorCreateForSavedObject: false,
  loadingCreateForDocumentAndForSavedObject: false,
  errorCreateForDocumentAndForSavedObject: false,
  loadingDeleteNoteIds: [],
  errorDelete: false,
  //
  notesById: {},
  errors: [],
  enableExperimental: { ...allowedExperimentalValues },
  eventIdsToFetch: [],
  nonTimelineEventNotesLoading: false,
  nonTimelineEventNotesError: null,
};

interface UpdateNotesByIdParams {
  note: Note;
  notesById: NotesById;
}

export const updateNotesById = ({ note, notesById }: UpdateNotesByIdParams): NotesById => ({
  ...notesById,
  [note.id]: note,
});

export const appReducer = reducerWithInitialState(initialAppState)
  .case(fetchNotesByDocumentRequest, (state) => {
    return {
      ...state,
      loadingFetchByDocument: true,
      errorFetchByDocument: false,
    };
  })
  .case(fetchNotesByDocumentSuccess, (state, { documentId, data }) => {
    let idsBySavedObjectId = { ...state.idsBySavedObjectId };
    const uniqueSavedObjectId = [
      ...new Set(Object.values(data.entities.notes).map((note) => note.timelineId)),
    ];
    uniqueSavedObjectId.forEach((savedObjectId: string) => {
      const savedObjectIdNotes = idsBySavedObjectId[savedObjectId] || [];
      const newSavedObjectIdNotes = Object.values(data.entities.notes)
        .filter((note) => note.timelineId === savedObjectId)
        .map((note) => note.noteId);
      const newIdsBySavedObjectId = [...new Set([...savedObjectIdNotes, ...newSavedObjectIdNotes])];
      idsBySavedObjectId = {
        ...idsBySavedObjectId,
        [savedObjectId]: newIdsBySavedObjectId,
      };
    });

    return {
      ...state,
      byId: { ...state.byId, ...data.entities.notes },
      allIds: [...state.allIds, ...data.result],
      idsByDocumentId: { ...state.idsByDocumentId, [documentId]: data.result },
      idsBySavedObjectId,
      loadingFetchByDocument: false,
      errorFetchByDocument: false,
    };
  })
  .case(fetchNotesByDocumentsRequest, (state) => {
    return {
      ...state,
      loadingFetchByDocument: true,
      errorFetchByDocument: false,
    };
  })
  .case(fetchNotesByDocumentsSuccess, (state, { documentIds, data }) => {
    let idsByDocumentId = { ...state.idsByDocumentId };
    documentIds.forEach((documentId: string) => {
      const documentIdNotes = idsByDocumentId[documentId] || [];
      const newDocumentIdNotes = Object.values(data.entities.notes)
        .filter((note) => note.eventId === documentId)
        .map((note) => note.noteId);
      const newIdsByDocumentId = [...new Set([...documentIdNotes, ...newDocumentIdNotes])];
      idsByDocumentId = {
        ...idsByDocumentId,
        [documentId]: newIdsByDocumentId,
      };
    });

    let idsBySavedObjectId = { ...state.idsBySavedObjectId };
    const uniqueSavedObjectId = [
      ...new Set(Object.values(data.entities.notes).map((note) => note.timelineId)),
    ];
    uniqueSavedObjectId.forEach((savedObjectId: string) => {
      const savedObjectIdNotes = idsBySavedObjectId[savedObjectId] || [];
      const newSavedObjectIdNotes = Object.values(data.entities.notes)
        .filter((note) => note.timelineId === savedObjectId)
        .map((note) => note.noteId);
      const newIdsBySavedObjectId = [...new Set([...savedObjectIdNotes, ...newSavedObjectIdNotes])];
      idsBySavedObjectId = {
        ...idsBySavedObjectId,
        [savedObjectId]: newIdsBySavedObjectId,
      };
    });

    return {
      ...state,
      byId: { ...state.byId, ...data.entities.notes },
      allIds: [...state.allIds, ...data.result],
      idsByDocumentId,
      idsBySavedObjectId,
      loadingFetchByDocument: false,
      errorFetchByDocument: false,
    };
  })
  .case(fetchNotesByDocumentsFailure, (state) => {
    return {
      ...state,
      loadingFetchByDocument: false,
      errorFetchByDocument: true,
    };
  })
  .case(fetchNotesBySavedObjectRequest, (state, { savedObjectId }) => {
    return {
      ...state,
      loadingFetchBySavedObject: true,
      errorFetchBySavedObject: false,
    };
  })
  .case(fetchNotesBySavedObjectSuccess, (state, { savedObjectId, data }) => {
    let idsByDocumentId = { ...state.idsByDocumentId };
    const uniqueDocumentIds = [
      ...new Set(Object.values(data.entities.notes).map((note) => note.eventId)),
    ];
    uniqueDocumentIds.forEach((documentId: string) => {
      const documentIdNotes = idsByDocumentId[documentId] || [];
      const newDocumentIdNotes = Object.values(data.entities.notes)
        .filter((note) => note.eventId === documentId)
        .map((note) => note.noteId);
      const newIdsByDocumentId = [...new Set([...documentIdNotes, ...newDocumentIdNotes])];
      idsByDocumentId = {
        ...idsByDocumentId,
        [documentId]: newIdsByDocumentId,
      };
    });

    return {
      ...state,
      byId: { ...state.byId, ...data.entities.notes },
      allIds: [...state.allIds, ...data.result],
      idsByDocumentId,
      idsBySavedObjectId: { ...state.idsBySavedObjectId, [savedObjectId]: data.result },
      loadingFetchBySavedObject: false,
      errorFetchBySavedObject: false,
    };
  })
  .case(fetchNotesBySavedObjectFailure, (state) => {
    return {
      ...state,
      loadingFetchBySavedObject: false,
      errorFetchBySavedObject: true,
    };
  })
  .case(createNoteForDocumentRequest, (state, { documentId }) => {
    return {
      ...state,
      loadingCreateForDocument: true,
      errorCreateForDocument: false,
    };
  })
  .case(createNoteForDocumentSuccess, (state, { documentId, data }) => {
    return {
      ...state,
      byId: { ...state.byId, ...data.entities.notes },
      allIds: [...state.allIds, data.result],
      idsByDocumentId: {
        ...state.idsByDocumentId,
        [documentId]: [...(state.idsByDocumentId[documentId] || []), data.result],
      },
      loadingCreateForDocument: false,
      errorCreateForDocument: false,
    };
  })
  .case(createNoteForDocumentFailure, (state) => {
    return {
      ...state,
      loadingCreateForDocument: false,
      errorCreateForDocument: true,
    };
  })
  .case(createNoteForTimelineRequest, (state, { savedObjectId }) => {
    return {
      ...state,
      loadingCreateForSavedObject: true,
      errorCreateForSavedObject: false,
    };
  })
  .case(createNoteForTimelineSuccess, (state, { savedObjectId, data }) => {
    return {
      ...state,
      byId: { ...state.byId, ...data.entities.notes },
      allIds: [...state.allIds, data.result],
      idsBySavedObjectId: {
        ...state.idsBySavedObjectId,
        [savedObjectId]: [...(state.idsBySavedObjectId[savedObjectId] || []), data.result],
      },
      loadingCreateForSavedObject: false,
      errorCreateForSavedObject: false,
    };
  })
  .case(createNoteForTimelineFailure, (state) => {
    return {
      ...state,
      loadingCreateForSavedObject: false,
      errorCreateForSavedObject: true,
    };
  })
  .case(createNoteForDocumentAndTimelineRequest, (state, { documentId, savedObjectId }) => {
    return {
      ...state,
      loadingCreateForDocumentAndForSavedObject: true,
      errorCreateForDocumentAndForSavedObject: false,
    };
  })
  .case(createNoteForDocumentAndTimelineSuccess, (state, { documentId, savedObjectId, data }) => {
    return {
      ...state,
      byId: { ...state.byId, ...data.entities.notes },
      allIds: [...state.allIds, data.result],
      idsByDocumentId: {
        ...state.idsByDocumentId,
        [documentId]: [...(state.idsByDocumentId[documentId] || []), data.result],
      },
      idsBySavedObjectId: {
        ...state.idsBySavedObjectId,
        [savedObjectId]: [...(state.idsBySavedObjectId[savedObjectId] || []), data.result],
      },
      loadingCreateForDocumentAndForSavedObject: false,
      errorCreateForDocumentAndForSavedObject: false,
    };
  })
  .case(createNoteForDocumentAndTimelineFailure, (state) => {
    return {
      ...state,
      loadingCreateForDocumentAndForSavedObject: false,
      errorCreateForDocumentAndForSavedObject: true,
    };
  })
  .case(deleteNoteRequest, (state, { note }) => {
    return {
      ...state,
      loadingDeleteNoteIds: [...state.loadingDeleteNoteIds, note.noteId],
      errorDelete: false,
    };
  })
  .case(deleteNoteSuccess, (state, { noteId, documentId, savedObjectId }) => {
    const byId = { ...state.byId };
    delete byId[noteId];

    const idsByDocumentId = { ...state.idsByDocumentId };
    let newIdsByDocumentId;
    if (documentId) {
      const documentIdNotes = (idsByDocumentId[documentId] || []).filter((id) => id !== noteId);
      newIdsByDocumentId = {
        ...state.idsByDocumentId,
        [documentId]: documentIdNotes,
      };
    } else {
      newIdsByDocumentId = idsByDocumentId;
    }

    const idsBySavedObjectId = { ...state.idsBySavedObjectId };
    let newIdsBySavedObjectId;
    if (savedObjectId) {
      const savedObjectIdNotes = (idsBySavedObjectId[savedObjectId] || []).filter(
        (id) => id !== noteId
      );
      newIdsBySavedObjectId = {
        ...state.idsBySavedObjectId,
        [savedObjectId]: savedObjectIdNotes,
      };
    } else {
      newIdsBySavedObjectId = idsBySavedObjectId;
    }

    return {
      ...state,
      byId,
      allIds: state.allIds.filter((id) => id !== noteId),
      idsByDocumentId: newIdsByDocumentId,
      idsBySavedObjectId: newIdsBySavedObjectId,
      loadingDeleteNoteIds: state.loadingDeleteNoteIds.filter((id) => id !== noteId),
      errorDelete: false,
    };
  })
  .case(deleteNoteFailure, (state, { noteId }) => {
    return {
      ...state,
      loadingDeleteNoteIds: state.loadingDeleteNoteIds.filter((id) => id !== noteId),
      errorDelete: true,
    };
  })
  .case(addNotes, (state, { notes }) => ({
    ...state,
    notesById: notes.reduce<NotesById>((acc, note: Note) => ({ ...acc, [note.id]: note }), {}),
  }))
  .case(deleteNote, (state, { id }) => ({
    ...state,
    notesById: Object.fromEntries(
      Object.entries(state.notesById).filter(([_, note]) => {
        return note.id !== id && note.saveObjectId !== id;
      })
    ),
  }))
  .case(updateNote, (state, { note }) => ({
    ...state,
    notesById: updateNotesById({ note, notesById: state.notesById }),
  }))
  .case(addError, (state, { id, title, message }) => ({
    ...state,
    errors: state.errors.concat({ id, title, message }),
  }))
  .case(removeError, (state, { id }) => ({
    ...state,
    errors: state.errors.filter((error) => error.id !== id),
  }))
  .case(addErrorHash, (state, { id, hash, title, message }) => {
    const errorIdx = state.errors.findIndex((e) => e.id === id);
    const errorObj = state.errors.find((e) => e.id === id) || { id, title, message };
    if (errorIdx === -1) {
      return {
        ...state,
        errors: state.errors.concat({
          ...errorObj,
          hash,
          displayError: !state.errors.some((e) => e.hash === hash),
        }),
      };
    }
    return {
      ...state,
      errors: [
        ...state.errors.slice(0, errorIdx),
        { ...errorObj, hash, displayError: !state.errors.some((e) => e.hash === hash) },
        ...state.errors.slice(errorIdx + 1),
      ],
    };
  })
  .build();
