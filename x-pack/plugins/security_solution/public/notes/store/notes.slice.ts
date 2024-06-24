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
import { createNote, fetchNotesByDocumentId as fetchNotesByDocumentIdApi } from '../api/api';
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
    createNoteByDocumentId: ReqStatus;
  };
  error: {
    fetchNotesByDocumentId: SerializedError | HttpError | null;
    createNoteByDocumentId: SerializedError | HttpError | null;
  };
}

const notesAdapter = createEntityAdapter<Note>({
  selectId: (note: Note) => note.noteId,
});

export const initialNotesState: NotesState = notesAdapter.getInitialState({
  status: {
    fetchNotesByDocumentId: ReqStatus.Idle,
    createNoteByDocumentId: ReqStatus.Idle,
  },
  error: {
    fetchNotesByDocumentId: null,
    createNoteByDocumentId: null,
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

export const createNoteByDocumentId = createAsyncThunk<
  NormalizedEntity<Note>,
  { note: BareNote },
  {}
>('notes/createNoteByDocumentId', async (args) => {
  const { note } = args;
  const res = await createNote({ note });
  return normalizeEntity(res);
});

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
      .addCase(createNoteByDocumentId.pending, (state) => {
        state.status.createNoteByDocumentId = ReqStatus.Loading;
      })
      .addCase(createNoteByDocumentId.fulfilled, (state, action) => {
        notesAdapter.addMany(state, action.payload.entities.notes);
        state.status.createNoteByDocumentId = ReqStatus.Succeeded;
      })
      .addCase(createNoteByDocumentId.rejected, (state, action) => {
        state.status.createNoteByDocumentId = ReqStatus.Failed;
        state.error.createNoteByDocumentId = action.payload ?? action.error;
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

export const selectCreateNoteByDocumentIdStatus = (state: State) =>
  state.notes.status.createNoteByDocumentId;

export const selectCreateNoteByDocumentIdError = (state: State) =>
  state.notes.error.createNoteByDocumentId;

export const selectNotesByDocumentId = createSelector(
  [selectAllNotes, (state, documentId) => documentId],
  (notes, documentId) => notes.filter((note) => note.eventId === documentId)
);
