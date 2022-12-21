/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FrameworkRequest } from '../../../framework';
import type {
  SavedNote,
  NoteSavedObject,
  PageInfoNote,
  SortNote,
  ResponseNotes,
  ResponseNote,
} from '../../../../../common/types/timeline/note';

export * from './saved_object';
export interface Notes {
  deleteNote: (request: FrameworkRequest, noteIds: string[]) => Promise<void>;
  deleteNoteByTimelineId: (request: FrameworkRequest, noteIds: string) => Promise<void>;
  getNote: (request: FrameworkRequest, noteId: string) => Promise<NoteSavedObject>;
  getNotesByEventId: (request: FrameworkRequest, noteId: string) => Promise<NoteSavedObject[]>;
  getNotesByTimelineId: (request: FrameworkRequest, noteId: string) => Promise<NoteSavedObject[]>;
  getAllNotes: (
    request: FrameworkRequest,
    pageInfo: PageInfoNote | null,
    search: string | null,
    sort: SortNote | null
  ) => Promise<ResponseNotes>;
  persistNote: ({
    request,
    noteId,
    note,
    overrideOwner,
  }: {
    request: FrameworkRequest;
    noteId: string | null;
    note: SavedNote;
    overrideOwner: boolean;
  }) => Promise<ResponseNote>;
  convertSavedObjectToSavedNote: (
    savedObject: unknown,
    timelineVersion?: string | undefined | null
  ) => NoteSavedObject;
}
