/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTES_URL, NOTE_URL } from '../../../../common/constants';
import {
  NoteSavedObject,
  PageInfoNote,
  SavedNote,
  SortNote,
} from '../../../../common/types/timeline/note';
import { KibanaServices } from '../../../common/lib/kibana';

export const getNote = async (id: string, signal: AbortSignal) => {
  const response = await KibanaServices.get().http.fetch<NoteSavedObject>(NOTE_URL, {
    method: 'GET',
    query: {
      id,
    },
    signal,
  });
  return response;
};

export const getAllNotes = async (
  pageInfo: PageInfoNote,
  search: string,
  sort: SortNote,
  signal: AbortSignal
) => {
  const response = await KibanaServices.get().http.get<NoteSavedObject[]>(NOTES_URL, {
    method: 'GET',
    body: JSON.stringify({
      pageInfo,
      search,
      sort,
    }),
    signal,
  });
  return response;
};

export const getNotesByEventId = async (eventId: string, signal: AbortSignal) => {
  const response = await KibanaServices.get().http.get<NoteSavedObject[]>(NOTES_URL, {
    method: 'GET',
    query: {
      eventId,
    },
    signal,
  });
  return response;
};

export const getNotesByTimelineId = async (timelineId: string, signal: AbortSignal) => {
  const response = await KibanaServices.get().http.get<NoteSavedObject[]>(NOTES_URL, {
    method: 'GET',
    query: {
      timelineId,
    },
    signal,
  });
  return response;
};

export const deleteNotes = async (id: string[], signal: AbortSignal) => {
  const response = await KibanaServices.get().http.delete<NoteSavedObject[]>(NOTES_URL, {
    method: 'DELETE',
    body: JSON.stringify(id),
    signal,
  });
  return response;
};

export const deleteNotesByTimelineId = async (timelineId: string, signal: AbortSignal) => {
  const response = await KibanaServices.get().http.delete<NoteSavedObject[]>(NOTE_URL, {
    method: 'DELETE',
    query: { timelineId },
    signal,
  });
  return response;
};

export const persistNote = async ({
  note,
  noteId,
  version,
  overrideOwner,
}: {
  note: SavedNote;
  noteId?: string | null;
  version?: string | null;
  overrideOwner?: boolean;
}) => {
  const response = await KibanaServices.get().http.patch<NoteSavedObject[]>(NOTE_URL, {
    method: 'PATCH',
    body: JSON.stringify({ noteId, version, note, overrideOwner }),
  });
  return response;
};
