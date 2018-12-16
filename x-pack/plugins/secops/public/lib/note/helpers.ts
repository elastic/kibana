/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';

import { Note } from '.';
import { NotesById } from '../../store/local/app/model';

interface GetApplicableNotesParams {
  noteIds: string[];
  notesById: NotesById;
}

export const getApplicableNotes = ({ noteIds, notesById }: GetApplicableNotesParams): Note[] =>
  noteIds.reduce(
    (notes, noteId) => (has(noteId, notesById) ? [...notes, notesById[noteId]] : notes),
    [] as Note[]
  );
