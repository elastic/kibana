/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as uuid from 'uuid';
import { miniSerializeError } from '@reduxjs/toolkit';
import type { SerializedError } from '@reduxjs/toolkit';
import {
  createNote,
  deleteNote,
  fetchNotesByDocumentIds,
  initialNotesState,
  notesReducer,
  ReqStatus,
  selectAllNotes,
  selectCreateNoteError,
  selectCreateNoteStatus,
  selectDeleteNoteError,
  selectDeleteNoteStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectNoteById,
  selectNoteIds,
  selectNotesByDocumentId,
  selectNotesPagination,
  selectNotesTablePendingDeleteIds,
  selectNotesTableSearch,
  selectNotesTableSelectedIds,
  selectNotesTableSort,
  selectNotesTableTotalItems,
  selectFetchNotesStatus,
  selectFetchNotesError,
  selectDeleteNotesStatus,
  deleteNotes,
  fetchNotes,
} from './notes.slice';
import type { NotesState } from './notes.slice';
import { mockGlobalState } from '../../common/mock';

const initalEmptyState = initialNotesState;

export const generateNoteMock = (documentIds: string[]) =>
  documentIds.map((documentId: string) => ({
    noteId: uuid.v4(),
    version: 'WzU1MDEsMV0=',
    timelineId: '',
    eventId: documentId,
    note: 'This is a mocked note',
    created: new Date().getTime(),
    createdBy: 'elastic',
    updated: new Date().getTime(),
    updatedBy: 'elastic',
  }));

const mockNote = { ...generateNoteMock(['1'])[0] };
const initialNonEmptyState: NotesState = {
  entities: {
    [mockNote.noteId]: mockNote,
  },
  ids: [mockNote.noteId],
  status: {
    fetchNotesByDocumentIds: ReqStatus.Idle,
    createNote: ReqStatus.Idle,
    deleteNote: ReqStatus.Idle,
    fetchNotes: ReqStatus.Idle,
    deleteNotes: ReqStatus.Idle,
  },
  error: {
    fetchNotesByDocumentIds: null,
    createNote: null,
    deleteNote: null,
    fetchNotes: null,
    deleteNotes: null,
  },
  pagination: {
    page: 1,
    perPage: 10,
    total: 1,
  },
  sort: {
    field: 'created',
    direction: 'desc',
  },
  filter: '',
  search: '',
  selectedIds: [],
  pendingDeleteIds: [],
};

describe('notesSlice', () => {
  describe('notesReducer', () => {
    it('should handle an unknown action and return the initial state', () => {
      expect(notesReducer(initalEmptyState, { type: 'unknown' })).toEqual({
        entities: {},
        ids: [],
        status: {
          fetchNotesByDocumentIds: ReqStatus.Idle,
          createNote: ReqStatus.Idle,
          deleteNote: ReqStatus.Idle,
        },
        error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
      });
    });

    describe('fetchNotesByDocumentIds', () => {
      it('should set correct status state when fetching notes by document id', () => {
        const action = { type: fetchNotesByDocumentIds.pending.type };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Loading,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Idle,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should set correct state when success on fetch notes by document id on an empty state', () => {
        const action = {
          type: fetchNotesByDocumentIds.fulfilled.type,
          payload: {
            entities: {
              notes: {
                [mockNote.noteId]: mockNote,
              },
            },
            result: [mockNote.noteId],
          },
        };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: action.payload.entities.notes,
          ids: action.payload.result,
          status: {
            fetchNotesByDocumentIds: ReqStatus.Succeeded,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Idle,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should replace notes when success on fetch notes by document id on a non-empty state', () => {
        const newMockNote = { ...mockNote, timelineId: 'timelineId' };
        const action = {
          type: fetchNotesByDocumentIds.fulfilled.type,
          payload: {
            entities: {
              notes: {
                [newMockNote.noteId]: newMockNote,
              },
            },
            result: [newMockNote.noteId],
          },
        };

        expect(notesReducer(initialNonEmptyState, action)).toEqual({
          entities: action.payload.entities.notes,
          ids: action.payload.result,
          status: {
            fetchNotesByDocumentIds: ReqStatus.Succeeded,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Idle,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should set correct error state when failing to fetch notes by document id', () => {
        const action = { type: fetchNotesByDocumentIds.rejected.type, error: 'error' };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Failed,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Idle,
          },
          error: {
            fetchNotesByDocumentIds: 'error',
            createNote: null,
            deleteNote: null,
          },
        });
      });
    });

    describe('createNote', () => {
      it('should set correct status state when creating a note by document id', () => {
        const action = { type: createNote.pending.type };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Idle,
            createNote: ReqStatus.Loading,
            deleteNote: ReqStatus.Idle,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should set correct state when success on create a note by document id on an empty state', () => {
        const action = {
          type: createNote.fulfilled.type,
          payload: {
            entities: {
              notes: {
                [mockNote.noteId]: mockNote,
              },
            },
            result: mockNote.noteId,
          },
        };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: action.payload.entities.notes,
          ids: [action.payload.result],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Idle,
            createNote: ReqStatus.Succeeded,
            deleteNote: ReqStatus.Idle,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should set correct error state when failing to create a note by document id', () => {
        const action = { type: createNote.rejected.type, error: 'error' };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Idle,
            createNote: ReqStatus.Failed,
            deleteNote: ReqStatus.Idle,
          },
          error: {
            fetchNotesByDocumentIds: null,
            createNote: 'error',
            deleteNote: null,
          },
        });
      });
    });

    describe('deleteNote', () => {
      it('should set correct status state when deleting a note', () => {
        const action = { type: deleteNote.pending.type };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Idle,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Loading,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should set correct state when success on deleting a note', () => {
        const action = {
          type: deleteNote.fulfilled.type,
          payload: mockNote.noteId,
        };

        expect(notesReducer(initialNonEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Idle,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Succeeded,
          },
          error: { fetchNotesByDocumentIds: null, createNote: null, deleteNote: null },
        });
      });

      it('should set correct state when failing to create a note by document id', () => {
        const action = { type: deleteNote.rejected.type, error: 'error' };

        expect(notesReducer(initalEmptyState, action)).toEqual({
          entities: {},
          ids: [],
          status: {
            fetchNotesByDocumentIds: ReqStatus.Idle,
            createNote: ReqStatus.Idle,
            deleteNote: ReqStatus.Failed,
          },
          error: {
            fetchNotesByDocumentIds: null,
            createNote: null,
            deleteNote: 'error',
          },
        });
      });

      it('should set correct status when fetching notes', () => {
        const action = { type: fetchNotes.pending.type };
        expect(notesReducer(initialNotesState, action)).toEqual({
          ...initialNotesState,
          status: {
            ...initialNotesState.status,
            fetchNotes: ReqStatus.Loading,
          },
        });
      });

      it('should set notes and update pagination when fetch is successful', () => {
        const action = {
          type: fetchNotes.fulfilled.type,
          payload: {
            entities: { notes: { [mockNote.noteId]: mockNote, '2': { ...mockNote, noteId: '2' } } },
            totalCount: 2,
          },
        };
        const state = notesReducer(initialNotesState, action);
        expect(state.entities).toEqual(action.payload.entities.notes);
        expect(state.ids).toHaveLength(2);
        expect(state.pagination.total).toBe(2);
        expect(state.status.fetchNotes).toBe(ReqStatus.Succeeded);
      });

      it('should set error when fetch fails', () => {
        const action = { type: fetchNotes.rejected.type, error: { message: 'Failed to fetch' } };
        const state = notesReducer(initialNotesState, action);
        expect(state.status.fetchNotes).toBe(ReqStatus.Failed);
        expect(state.error.fetchNotes).toEqual({ message: 'Failed to fetch' });
      });

      it('should set correct status when deleting multiple notes', () => {
        const action = { type: deleteNotes.pending.type };
        expect(notesReducer(initialNotesState, action)).toEqual({
          ...initialNotesState,
          status: {
            ...initialNotesState.status,
            deleteNotes: ReqStatus.Loading,
          },
        });
      });

      it('should remove multiple notes when delete is successful', () => {
        const initialState = {
          ...initialNotesState,
          entities: { '1': mockNote, '2': { ...mockNote, noteId: '2' } },
          ids: ['1', '2'],
        };
        const action = { type: deleteNotes.fulfilled.type, payload: ['1', '2'] };
        const state = notesReducer(initialState, action);
        expect(state.entities).toEqual({});
        expect(state.ids).toHaveLength(0);
        expect(state.status.deleteNotes).toBe(ReqStatus.Succeeded);
      });

      it('should set error when delete fails', () => {
        const action = { type: deleteNotes.rejected.type, error: { message: 'Failed to delete' } };
        const state = notesReducer(initialNotesState, action);
        expect(state.status.deleteNotes).toBe(ReqStatus.Failed);
        expect(state.error.deleteNotes).toEqual({ message: 'Failed to delete' });
      });
    });
  });

  describe('selectors', () => {
    it('should return all notes', () => {
      const state = mockGlobalState;
      state.notes.entities = initialNonEmptyState.entities;
      state.notes.ids = initialNonEmptyState.ids;
      expect(selectAllNotes(state)).toEqual([mockNote]);
    });

    it('should return note by id', () => {
      const state = mockGlobalState;
      state.notes.entities = initialNonEmptyState.entities;
      state.notes.ids = initialNonEmptyState.ids;
      expect(selectNoteById(state, mockNote.noteId)).toEqual(mockNote);
    });

    it('should return note ids', () => {
      const state = mockGlobalState;
      state.notes.entities = initialNonEmptyState.entities;
      state.notes.ids = initialNonEmptyState.ids;
      expect(selectNoteIds(state)).toEqual([mockNote.noteId]);
    });

    it('should return fetch notes by document id status', () => {
      expect(selectFetchNotesByDocumentIdsStatus(mockGlobalState)).toEqual(ReqStatus.Idle);
    });

    it('should return fetch notes by document id error', () => {
      expect(selectFetchNotesByDocumentIdsError(mockGlobalState)).toEqual(null);
    });

    it('should return create note by document id status', () => {
      expect(selectCreateNoteStatus(mockGlobalState)).toEqual(ReqStatus.Idle);
    });

    it('should return create note by document id error', () => {
      expect(selectCreateNoteError(mockGlobalState)).toEqual(null);
    });

    it('should return delete note status', () => {
      expect(selectDeleteNoteStatus(mockGlobalState)).toEqual(ReqStatus.Idle);
    });

    it('should return delete note error', () => {
      expect(selectDeleteNoteError(mockGlobalState)).toEqual(null);
    });

    it('should return all notes for an existing document id', () => {
      expect(selectNotesByDocumentId(mockGlobalState, '1')).toEqual([mockNote]);
    });

    it('should return no notes if document id does not exist', () => {
      expect(selectNotesByDocumentId(mockGlobalState, '2')).toHaveLength(0);
    });

    it('should select notes pagination', () => {
      const state = {
        ...mockGlobalState,
        notes: { ...initialNotesState, pagination: { page: 2, perPage: 20, total: 100 } },
      };
      expect(selectNotesPagination(state)).toEqual({ page: 2, perPage: 20, total: 100 });
    });

    it('should select notes table sort', () => {
      const notes: NotesState = {
        ...initialNotesState,
        sort: { field: 'created', direction: 'asc' },
      };
      const state = {
        ...mockGlobalState,
        notes,
      };
      expect(selectNotesTableSort(state)).toEqual({ field: 'created', direction: 'asc' });
    });

    it('should select notes table total items', () => {
      const state = {
        ...mockGlobalState,
        notes: {
          ...initialNotesState,
          pagination: { ...initialNotesState.pagination, total: 100 },
        },
      };
      expect(selectNotesTableTotalItems(state)).toBe(100);
    });

    it('should select notes table selected ids', () => {
      const state = {
        ...mockGlobalState,
        notes: { ...initialNotesState, selectedIds: ['1', '2'] },
      };
      expect(selectNotesTableSelectedIds(state)).toEqual(['1', '2']);
    });

    it('should select notes table search', () => {
      const state = { ...mockGlobalState, notes: { ...initialNotesState, search: 'test search' } };
      expect(selectNotesTableSearch(state)).toBe('test search');
    });

    it('should select notes table pending delete ids', () => {
      const state = {
        ...mockGlobalState,
        notes: { ...initialNotesState, pendingDeleteIds: ['1', '2'] },
      };
      expect(selectNotesTablePendingDeleteIds(state)).toEqual(['1', '2']);
    });

    it('should select delete notes status', () => {
      const state = {
        ...mockGlobalState,
        notes: {
          ...initialNotesState,
          status: { ...initialNotesState.status, deleteNotes: ReqStatus.Loading },
        },
      };
      expect(selectDeleteNotesStatus(state)).toBe(ReqStatus.Loading);
    });

    it('should select fetch notes error', () => {
      const error = new Error('Error fetching notes');
      const reudxToolKItError = miniSerializeError(error);
      const notes: NotesState = {
        ...initialNotesState,
        error: { ...initialNotesState.error, fetchNotes: reudxToolKItError },
      };
      const state = {
        ...mockGlobalState,
        notes,
      };
      const selectedError = selectFetchNotesError(state) as SerializedError;
      expect(selectedError.message).toBe('Error fetching notes');
    });

    it('should select fetch notes status', () => {
      const state = {
        ...mockGlobalState,
        notes: {
          ...initialNotesState,
          status: { ...initialNotesState.status, fetchNotes: ReqStatus.Succeeded },
        },
      };
      expect(selectFetchNotesStatus(state)).toBe(ReqStatus.Succeeded);
    });
  });
});
