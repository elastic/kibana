/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { Note } from '../../lib/note';
import type { Note as TimelineNote } from '../../../../common/api/timeline';

export type ErrorState = ErrorModel;

export interface NotesById {
  [id: string]: Note;
}

export interface Error {
  id: string;
  title: string;
  message: string[];
  hash?: string;
  displayError?: boolean;
}

export type ErrorModel = Error[];

export interface AppModel {
  // old
  notesById: NotesById;
  errors: ErrorState;
  enableExperimental: ExperimentalFeatures;
  eventIdsToFetch: string[];
  nonTimelineEventNotesLoading: boolean;
  nonTimelineEventNotesError: string | null;
  // new
  byId: { [id: string]: TimelineNote };
  allIds: string[];
  idsByDocumentId: { [documentId: string]: string[] };
  idsBySavedObjectId: { [objectId: string]: string[] };
  loadingFetchByDocument: boolean;
  errorFetchByDocument: boolean;
  loadingFetchBySavedObject: boolean;
  errorFetchBySavedObject: boolean;
  loadingCreateForDocument: boolean;
  errorCreateForDocument: boolean;
  loadingCreateForSavedObject: boolean;
  errorCreateForSavedObject: boolean;
  loadingCreateForDocumentAndForSavedObject: boolean;
  errorCreateForDocumentAndForSavedObject: boolean;
  loadingDeleteNoteIds: string[];
  errorDelete: boolean;
}
