/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedNote, NoteSavedObject } from '../../../common/types/timeline/note';
import { PageInfoNote, ResponseNote, ResponseNotes, SortNote } from '../../graphql/types';
import { FrameworkRequest } from '../framework';

export { deleteNote } from './delete_note';
export { deleteNoteByTimelineId } from './delete_nots_by_timeline_id';
export { getNote } from './get_note';
export { getNotesByEventId } from './get_notes_by_event_id';
export { getNotesByTimelineId } from './get_notes_by_timeline_id';
export { getAllNotes } from './get_all_notes';
export { persistNote } from './persist_note';
export { persistNotes } from './persist_notes';

export { convertSavedObjectToSavedNote } from './helpers';

export interface Note {
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
  persistNote: (
    request: FrameworkRequest,
    noteId: string | null,
    version: string | null,
    note: SavedNote,
    overrideOwner: boolean
  ) => Promise<ResponseNote>;
  convertSavedObjectToSavedNote: (
    savedObject: unknown,
    timelineVersion?: string | undefined | null
  ) => NoteSavedObject;
}
