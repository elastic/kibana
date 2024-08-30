/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export const fetchNotes = async ({
  page,
  perPage,
  sortField,
  sortOrder,
  filter,
  search,
}: {
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: string;
  filter: string;
  search: string;
}) => {
  const response = await KibanaServices.get().http.get<{ totalCount: number; notes: Note[] }>(
    NOTE_URL,
    {
      query: {
        page,
        perPage,
        sortField,
        sortOrder,
        filter,
        search,
      },
      version: '2023-10-31',
    }
  );
  return response;
};

/**
 * Fetches all the notes for an array of document ids
 */
export const fetchNotesByDocumentIds = async (documentIds: string[]) => {
  const response = await KibanaServices.get().http.get<{ notes: Note[]; totalCount: number }>(
    NOTE_URL,
    {
      query: { documentIds },
      version: '2023-10-31',
    }
  );
  return response;
};

/**
 * Deletes multiple notes
 */
export const deleteNotes = async (noteIds: string[]) => {
  const response = await KibanaServices.get().http.delete<{ data: unknown }>(NOTE_URL, {
    body: JSON.stringify({ noteIds }),
    version: '2023-10-31',
  });
  return response;
};
