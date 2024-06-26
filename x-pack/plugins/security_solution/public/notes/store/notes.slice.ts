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
  deleteNote as deleteNoteApi,
  fetchNotesByDocumentId as fetchNotesByDocumentIdApi,
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
    fetchNotesByDocumentId: ReqStatus;
    createNote: ReqStatus;
    deleteNote: ReqStatus;
  };
  error: {
    fetchNotesByDocumentId: SerializedError | HttpError | null;
    createNote: SerializedError | HttpError | null;
    deleteNote: SerializedError | HttpError | null;
  };
}

const notesAdapter = createEntityAdapter<Note>({
  selectId: (note: Note) => note.noteId,
});

export const initialNotesState: NotesState = notesAdapter.getInitialState({
  status: {
    fetchNotesByDocumentId: ReqStatus.Idle,
    createNote: ReqStatus.Idle,
    deleteNote: ReqStatus.Idle,
  },
  error: {
    fetchNotesByDocumentId: null,
    createNote: null,
    deleteNote: null,
  },
});

export const fetchNotesByDocumentId = createAsyncThunk<
  NormalizedEntities<Note>,
  { documentId: string },
  {}
>('notes/fetchNotesByDocumentId', async (args) => {
  const { documentId } = args;
  const res = await fetchNotesByDocumentIdApi(documentId);
  return normalizeEntities(res);
});

export const createNote = createAsyncThunk<NormalizedEntity<Note>, { note: BareNote }, {}>(
  'notes/createNote',
  async (args) => {
    const { note } = args;
    const res = await createNoteApi({ note });
    return normalizeEntity(res);
  }
);

export const deleteNote = createAsyncThunk<string, { id: string }, {}>(
  'notes/deleteNote',
  async (args) => {
    const { id } = args;
    await deleteNoteApi(id);
    return id;
  }
);

const notesSlice = createSlice({
  name: 'notes',
  initialState: initialNotesState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchNotesByDocumentId.pending, (state) => {
        state.status.fetchNotesByDocumentId = ReqStatus.Loading;
      })
      .addCase(fetchNotesByDocumentId.fulfilled, (state, action) => {
        notesAdapter.upsertMany(state, action.payload.entities.notes);
        state.status.fetchNotesByDocumentId = ReqStatus.Succeeded;
      })
      .addCase(fetchNotesByDocumentId.rejected, (state, action) => {
        state.status.fetchNotesByDocumentId = ReqStatus.Failed;
        state.error.fetchNotesByDocumentId = action.payload ?? action.error;
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
      .addCase(deleteNote.pending, (state) => {
        state.status.deleteNote = ReqStatus.Loading;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        notesAdapter.removeOne(state, action.payload);
        state.status.deleteNote = ReqStatus.Succeeded;
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.status.deleteNote = ReqStatus.Failed;
        state.error.deleteNote = action.payload ?? action.error;
      });
  },
});

export const notesReducer = notesSlice.reducer;

export const {
  selectAll: selectAllNotes,
  selectById: selectNoteById,
  selectIds: selectNoteIds,
} = notesAdapter.getSelectors((state: State) => state.notes);

export const selectFetchNotesByDocumentIdStatus = (state: State) =>
  state.notes.status.fetchNotesByDocumentId;

export const selectFetchNotesByDocumentIdError = (state: State) =>
  state.notes.error.fetchNotesByDocumentId;

export const selectCreateNoteStatus = (state: State) => state.notes.status.createNote;

export const selectCreateNoteError = (state: State) => state.notes.error.createNote;

export const selectDeleteNoteStatus = (state: State) => state.notes.status.deleteNote;

export const selectDeleteNoteError = (state: State) => state.notes.error.deleteNote;

export const selectNotesByDocumentId = createSelector(
  [selectAllNotes, (state, documentId) => documentId],
  (notes, documentId) => notes.filter((note) => note.eventId === documentId)
);
