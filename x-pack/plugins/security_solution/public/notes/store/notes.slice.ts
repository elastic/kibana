/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityState, SerializedError } from '@reduxjs/toolkit';
import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { State } from '../../common/store';
import {
  createNote as createNoteApi,
  deleteNotes as deleteNotesApi,
  fetchNotes as fetchNotesApi,
  fetchNotesByDocumentIds as fetchNotesByDocumentIdsApi,
} from '../api/api';
import type { NormalizedEntities, NormalizedEntity } from './normalize';
import { normalizeEntities, normalizeEntity } from './normalize';
import type { BareNote, Note } from '../../../common/api/timeline';

export enum ReqStatus {
  Idle = 'idle',
  Loading = 'loading',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

interface HttpError {
  type: 'http';
  status: number;
}

export interface NotesState extends EntityState<Note> {
  status: {
    fetchNotesByDocumentIds: ReqStatus;
    createNote: ReqStatus;
    deleteNotes: ReqStatus;
    fetchNotes: ReqStatus;
  };
  error: {
    fetchNotesByDocumentIds: SerializedError | HttpError | null;
    createNote: SerializedError | HttpError | null;
    deleteNotes: SerializedError | HttpError | null;
    fetchNotes: SerializedError | HttpError | null;
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
  sort: {
    field: keyof Note;
    direction: 'asc' | 'desc';
  };
  filter: string;
  search: string;
  selectedIds: string[];
  pendingDeleteIds: string[];
}

const notesAdapter = createEntityAdapter<Note>({
  selectId: (note: Note) => note.noteId,
});

export const initialNotesState: NotesState = notesAdapter.getInitialState({
  status: {
    fetchNotesByDocumentIds: ReqStatus.Idle,
    createNote: ReqStatus.Idle,
    deleteNotes: ReqStatus.Idle,
    fetchNotes: ReqStatus.Idle,
  },
  error: {
    fetchNotesByDocumentIds: null,
    createNote: null,
    deleteNotes: null,
    fetchNotes: null,
  },
  pagination: {
    page: 1,
    perPage: 10,
    total: 0,
  },
  sort: {
    field: 'created',
    direction: 'desc',
  },
  filter: '',
  search: '',
  selectedIds: [],
  pendingDeleteIds: [],
});

export const fetchNotesByDocumentIds = createAsyncThunk<
  NormalizedEntities<Note>,
  { documentIds: string[] },
  {}
>('notes/fetchNotesByDocumentIds', async (args) => {
  const { documentIds } = args;
  const res = await fetchNotesByDocumentIdsApi(documentIds);
  return normalizeEntities(res.notes);
});

export const fetchNotes = createAsyncThunk<
  NormalizedEntities<Note> & { totalCount: number },
  {
    page: number;
    perPage: number;
    sortField: string;
    sortOrder: string;
    filter: string;
    search: string;
  },
  {}
>('notes/fetchNotes', async (args) => {
  const { page, perPage, sortField, sortOrder, filter, search } = args;
  const res = await fetchNotesApi({ page, perPage, sortField, sortOrder, filter, search });
  return { ...normalizeEntities(res.notes), totalCount: res.totalCount };
});

export const createNote = createAsyncThunk<NormalizedEntity<Note>, { note: BareNote }, {}>(
  'notes/createNote',
  async (args) => {
    const { note } = args;
    const res = await createNoteApi({ note });
    return normalizeEntity(res);
  }
);

export const deleteNotes = createAsyncThunk<string[], { ids: string[] }, {}>(
  'notes/deleteNotes',
  async (args) => {
    const { ids } = args;
    await deleteNotesApi(ids);
    return ids;
  }
);

const notesSlice = createSlice({
  name: 'notes',
  initialState: initialNotesState,
  reducers: {
    userSelectedPage: (state, action: { payload: number }) => {
      state.pagination.page = action.payload;
    },
    userSelectedPerPage: (state, action: { payload: number }) => {
      state.pagination.perPage = action.payload;
    },
    userSortedNotes: (
      state,
      action: { payload: { field: keyof Note; direction: 'asc' | 'desc' } }
    ) => {
      state.sort = action.payload;
    },
    userFilteredNotes: (state, action: { payload: string }) => {
      state.filter = action.payload;
    },
    userSearchedNotes: (state, action: { payload: string }) => {
      state.search = action.payload;
    },
    userSelectedRow: (state, action: { payload: string[] }) => {
      state.selectedIds = action.payload;
    },
    userClosedDeleteModal: (state) => {
      state.pendingDeleteIds = [];
    },
    userSelectedRowForDeletion: (state, action: { payload: string }) => {
      state.pendingDeleteIds = [action.payload];
    },
    userSelectedBulkDelete: (state) => {
      state.pendingDeleteIds = state.selectedIds;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchNotesByDocumentIds.pending, (state) => {
        state.status.fetchNotesByDocumentIds = ReqStatus.Loading;
      })
      .addCase(fetchNotesByDocumentIds.fulfilled, (state, action) => {
        notesAdapter.upsertMany(state, action.payload.entities.notes);
        state.status.fetchNotesByDocumentIds = ReqStatus.Succeeded;
      })
      .addCase(fetchNotesByDocumentIds.rejected, (state, action) => {
        state.status.fetchNotesByDocumentIds = ReqStatus.Failed;
        state.error.fetchNotesByDocumentIds = action.payload ?? action.error;
      })
      .addCase(createNote.pending, (state) => {
        state.status.createNote = ReqStatus.Loading;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        notesAdapter.addMany(state, action.payload.entities.notes);
        state.status.createNote = ReqStatus.Succeeded;
      })
      .addCase(createNote.rejected, (state, action) => {
        state.status.createNote = ReqStatus.Failed;
        state.error.createNote = action.payload ?? action.error;
      })
      .addCase(deleteNotes.pending, (state) => {
        state.status.deleteNotes = ReqStatus.Loading;
      })
      .addCase(deleteNotes.fulfilled, (state, action) => {
        notesAdapter.removeMany(state, action.payload);
        state.status.deleteNotes = ReqStatus.Succeeded;
        state.pendingDeleteIds = state.pendingDeleteIds.filter(
          (value) => !action.payload.includes(value)
        );
      })
      .addCase(deleteNotes.rejected, (state, action) => {
        state.status.deleteNotes = ReqStatus.Failed;
        state.error.deleteNotes = action.payload ?? action.error;
      })
      .addCase(fetchNotes.pending, (state) => {
        state.status.fetchNotes = ReqStatus.Loading;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        notesAdapter.setAll(state, action.payload.entities.notes);
        state.pagination.total = action.payload.totalCount;
        state.status.fetchNotes = ReqStatus.Succeeded;
        state.selectedIds = [];
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.status.fetchNotes = ReqStatus.Failed;
        state.error.fetchNotes = action.payload ?? action.error;
      });
  },
});

export const notesReducer = notesSlice.reducer;

export const {
  selectAll: selectAllNotes,
  selectById: selectNoteById,
  selectIds: selectNoteIds,
} = notesAdapter.getSelectors((state: State) => state.notes);

export const selectFetchNotesByDocumentIdsStatus = (state: State) =>
  state.notes.status.fetchNotesByDocumentIds;

export const selectFetchNotesByDocumentIdsError = (state: State) =>
  state.notes.error.fetchNotesByDocumentIds;

export const selectCreateNoteStatus = (state: State) => state.notes.status.createNote;

export const selectCreateNoteError = (state: State) => state.notes.error.createNote;

export const selectDeleteNotesStatus = (state: State) => state.notes.status.deleteNotes;

export const selectDeleteNotesError = (state: State) => state.notes.error.deleteNotes;

export const selectNotesPagination = (state: State) => state.notes.pagination;

export const selectNotesTableSort = (state: State) => state.notes.sort;

export const selectNotesTableSelectedIds = (state: State) => state.notes.selectedIds;

export const selectNotesTableSearch = (state: State) => state.notes.search;

export const selectNotesTablePendingDeleteIds = (state: State) => state.notes.pendingDeleteIds;

export const selectFetchNotesError = (state: State) => state.notes.error.fetchNotes;

export const selectFetchNotesStatus = (state: State) => state.notes.status.fetchNotes;

export const selectNotesByDocumentId = createSelector(
  [selectAllNotes, (state, documentId) => documentId],
  (notes, documentId) => notes.filter((note) => note.eventId === documentId)
);

export const {
  userSelectedPage,
  userSelectedPerPage,
  userSortedNotes,
  userFilteredNotes,
  userSearchedNotes,
  userSelectedRow,
  userClosedDeleteModal,
  userSelectedRowForDeletion,
  userSelectedBulkDelete,
} = notesSlice.actions;
