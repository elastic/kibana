/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { keys, memoize } from 'lodash/fp';
import { Note } from '../../../lib/note';
import { State } from '../../reducer';
import { NotesById } from './model';

const selectNotesById = (state: State): NotesById => state.local.app.notesById;

const getNotes = (notesById: NotesById, eventIds: string[]) =>
  keys(notesById).reduce((acc: Note[], noteId: string) => {
    if (eventIds.includes(noteId)) {
      const note: Note = notesById[noteId];
      acc = [...acc, note];
    }
    return acc;
  }, []);

export const notesByIdsSelector = () =>
  createSelector(
    selectNotesById,
    (notesById: NotesById) => memoize((eventIds: string[]): Note[] => getNotes(notesById, eventIds))
  );
