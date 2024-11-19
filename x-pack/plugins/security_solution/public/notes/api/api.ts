/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BareNote,
  GetNotesResponse,
  PersistNoteRouteResponse,
} from '../../../common/api/timeline';
import type { AssociatedFilter } from '../../../common/notes/constants';
import { KibanaServices } from '../../common/lib/kibana';
import { NOTE_URL } from '../../../common/constants';

/**
 * Adds a new note.
 * This code is very close to the persistNote found in x-pack/plugins/security_solution/public/timelines/containers/notes/api.ts.
 * // TODO remove the old method when the transition to the new notes system is complete
 */
export const createNote = async ({ note }: { note: BareNote }) => {
  try {
    const response = await KibanaServices.get().http.patch<PersistNoteRouteResponse>(NOTE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
      version: '2023-10-31',
    });
    return response.note;
  } catch (err) {
    throw new Error(('message' in err && err.message) || 'Request failed');
  }
};

export const fetchNotes = async ({
  page,
  perPage,
  sortField,
  sortOrder,
  filter,
  createdByFilter,
  associatedFilter,
  search,
}: {
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: string;
  filter: string;
  createdByFilter: string;
  associatedFilter: AssociatedFilter;
  search: string;
}) => {
  const response = await KibanaServices.get().http.get<GetNotesResponse>(NOTE_URL, {
    query: {
      page,
      perPage,
      sortField,
      sortOrder,
      filter,
      createdByFilter,
      associatedFilter,
      search,
    },
    version: '2023-10-31',
  });
  return response;
};

/**
 * Fetches all the notes for an array of document ids
 */
export const fetchNotesByDocumentIds = async (documentIds: string[]) => {
  const response = await KibanaServices.get().http.get<GetNotesResponse>(NOTE_URL, {
    query: { documentIds },
    version: '2023-10-31',
  });
  return response;
};

/**
 * Fetches all the notes for an array of saved object ids
 */
export const fetchNotesBySaveObjectIds = async (savedObjectIds: string[]) => {
  const response = await KibanaServices.get().http.get<GetNotesResponse>(NOTE_URL, {
    query: { savedObjectIds },
    version: '2023-10-31',
  });
  return response;
};

/**
 * Deletes multiple notes
 */
export const deleteNotes = async (noteIds: string[]) => {
  const response = await KibanaServices.get().http.delete(NOTE_URL, {
    body: JSON.stringify({ noteIds }),
    version: '2023-10-31',
  });
  return response;
};
