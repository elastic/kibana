/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { Note } from '../../../lib/note';
import { updateNote } from './actions';
import { AppModel, NotesById } from './model';

export type AppState = AppModel;

export const initialAppState: AppState = {
  notesById: {},
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
  .case(updateNote, (state, { note }) => ({
    ...state,
    notesById: updateNotesById({ note, notesById: state.notesById }),
  }))
  .build();
