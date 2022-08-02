/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import type { Note } from '../../lib/note';

import { addError, addErrorHash, addNotes, removeError, updateNote } from './actions';
import type { AppModel, NotesById } from './model';
import { allowedExperimentalValues } from '../../../../common/experimental_features';

export type AppState = AppModel;

export const initialAppState: AppState = {
  notesById: {},
  errors: [],
  enableExperimental: { ...allowedExperimentalValues },
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
  .case(addNotes, (state, { notes }) => ({
    ...state,
    notesById: notes.reduce<NotesById>((acc, note: Note) => ({ ...acc, [note.id]: note }), {}),
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
