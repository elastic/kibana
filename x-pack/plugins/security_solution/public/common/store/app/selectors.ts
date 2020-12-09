/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keys, values } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import { Note } from '../../lib/note';
import { ErrorModel, NotesById } from './model';
import { State } from '../types';

const selectNotesById = (state: State): NotesById => state.app.notesById;

const getErrors = (state: State): ErrorModel => state.app.errors;

export const getNotes = memoizeOne((notesById: NotesById, noteIds: string[]): Note[] =>
  keys(notesById).reduce((acc: Note[], noteId: string) => {
    if (noteIds.includes(noteId)) {
      const note: Note = notesById[noteId];
      return [...acc, note];
    }
    return acc;
  }, [])
);

export const selectNotesByTimelineSavedObjectId = (
  state: State,
  timelineSavedObjectId: string
): Note[] =>
  values(state.app.notesById).reduce((acc: Note[], note: Note) => {
    if (note.timelineId === timelineSavedObjectId) {
      return [...acc, note];
    }
    return acc;
  }, []);

export const selectNotesByIdSelector = createSelector(
  selectNotesById,
  (notesById: NotesById) => notesById
);

export const notesByIdsSelector = () =>
  createSelector(selectNotesById, (notesById: NotesById) => notesById);

export const selectNotesByTimelineSavedObjectIdSelector = () =>
  createSelector(selectNotesByTimelineSavedObjectId, (notes: Note[]) => notes);

export const errorsSelector = () => createSelector(getErrors, (errors) => errors);
