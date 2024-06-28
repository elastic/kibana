/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as uuid from 'uuid';
import type { BareNote, Note } from '../../../common/api/timeline';
import { KibanaServices } from '../../common/lib/kibana';
import { NOTE_URL } from '../../../common/constants';

/**
 * Adds a new note.
 * This code is very close to the persistNote found in x-pack/plugins/security_solution/public/timelines/containers/notes/api.ts.
 * // TODO remove the old method when the transition to the new notes system is complete
 */
export const createNote = async ({ note }: { note: BareNote }) => {
  try {
    const response = await KibanaServices.get().http.patch<{
      data: { persistNote: { code: number; message: string; note: Note } };
    }>(NOTE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
      version: '2023-10-31',
    });
    return response.data.persistNote.note;
  } catch (err) {
    throw new Error(`Failed to stringify query: ${JSON.stringify(err)}`);
  }
};

// TODO point to the correct API when it is available
/**
 * Fetches all the notes for a document id
 */
export const fetchNotesByDocumentId = async (documentId: string) => {
  const response = {
    totalCount: 1,
    notes: [generateNoteMock(documentId)],
  };
  return response.notes;
};

// TODO remove when the API is available
export const generateNoteMock = (documentId: string) => ({
  noteId: uuid.v4(),
  version: 'WzU1MDEsMV0=',
  timelineId: '',
  eventId: documentId,
  note: 'This is a mocked note',
  created: new Date().getTime(),
  createdBy: 'elastic',
  updated: new Date().getTime(),
  updatedBy: 'elastic',
});

/**
 * Deletes a note
 */
export const deleteNote = async (noteId: string) => {
  const response = await KibanaServices.get().http.delete<{ data: unknown }>(NOTE_URL, {
    body: JSON.stringify({ noteId }),
    version: '2023-10-31',
  });
  return response;
};
