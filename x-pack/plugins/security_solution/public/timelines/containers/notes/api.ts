/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTE_URL } from '../../../../common/constants';
import type { BareNote, Note } from '../../../../common/api/timeline';
import { KibanaServices } from '../../../common/lib/kibana';

export const persistNote = async ({
  note,
  noteId,
  version,
  overrideOwner,
}: {
  note: BareNote;
  noteId?: string | null;
  version?: string | null;
  overrideOwner?: boolean;
}) => {
  let requestBody;

  try {
    requestBody = JSON.stringify({ noteId, version, note, overrideOwner });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  const response = await KibanaServices.get().http.patch<{
    data: { persistNote: { code: number; message: string; note: Note } };
  }>(NOTE_URL, {
    method: 'PATCH',
    body: requestBody,
    version: '2023-10-31',
  });
  return response;
};

export const deleteNote = async (noteId: string) => {
  const response = await KibanaServices.get().http.delete<{ data: unknown }>(NOTE_URL, {
    body: JSON.stringify({ noteId }),
    version: '2023-10-31',
  });
  return response;
};

export const fetchNotesByDocumentId = async (documentId: string) => {
  const response = await KibanaServices.get().http.get<{ totalCount: number; notes: Note[] }>(
    NOTE_URL,
    {
      query: {
        alertIds: [documentId],
        page: '1',
        perPage: '10',
        search: '',
        sortField: '',
        sortOrder: 'asc',
        filter: '',
      },
      version: '2023-10-31',
    }
  );
  return response;
};

export const fetchNotesByDocumentIds = async (documentIds: string[]) => {
  const response = await KibanaServices.get().http.get<{ totalCount: number; notes: Note[] }>(
    NOTE_URL,
    {
      query: {
        alertIds: documentIds,
        page: '1',
        perPage: '10',
        search: '',
        sortField: '',
        sortOrder: 'asc',
        filter: '',
      },
      version: '2023-10-31',
    }
  );
  return response;
};

// TODO server side needs implementation
export const fetchNotesBySavedObjectIdId = async (savedObjectId: string) => {
  const response = await KibanaServices.get().http.get<{ totalCount: number; notes: Note[] }>(
    NOTE_URL,
    {
      query: { savedObjectId },
      version: '2023-10-31',
    }
  );
  return response;
};
