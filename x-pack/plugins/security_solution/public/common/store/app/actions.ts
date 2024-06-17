/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

import type { Note } from '../../lib/note';
import type { NormalizedEntities, NormalizedEntity } from '../../../timelines/store/normalize';
import type { BareNote, Note as TimelineNote } from '../../../../common/api/timeline';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/app');

export const updateNote = actionCreator<{ note: Note }>('UPDATE_NOTE');

export const addNotes = actionCreator<{ notes: Note[] }>('ADD_NOTE');

export const deleteNote = actionCreator<{ id: string }>('DELETE_NOTE');

export const addError = actionCreator<{ id: string; title: string; message: string[] }>(
  'ADD_ERRORS'
);

export const removeError = actionCreator<{ id: string }>('REMOVE_ERRORS');

export const fetchNotesByDocumentRequest = actionCreator<{ documentId: string }>(
  'FETCH_NOTES_BY_DOCUMENT_ID_REQUEST'
);

export const fetchNotesByDocumentSuccess = actionCreator<{
  documentId: string;
  data: NormalizedEntities<TimelineNote>;
}>('FETCH_NOTES_BY_DOCUMENT_ID_SUCCESS');

export const fetchNotesByDocumentFailure = actionCreator('FETCH_NOTES_BY_DOCUMENT_ID_FAILURE');

export const fetchNotesByDocumentsRequest = actionCreator<{ documentIds: string[] }>(
  'FETCH_NOTES_BY_DOCUMENT_IDS_REQUEST'
);

export const fetchNotesByDocumentsSuccess = actionCreator<{
  documentIds: string[];
  data: NormalizedEntities<TimelineNote>;
}>('FETCH_NOTES_BY_DOCUMENT_IDS_SUCCESS');

export const fetchNotesByDocumentsFailure = actionCreator('FETCH_NOTES_BY_DOCUMENT_IDS_FAILURE');

export const fetchNotesBySavedObjectRequest = actionCreator<{ savedObjectId: string }>(
  'FETCH_NOTES_BY_SAVED_OBJECT_ID_REQUEST'
);

export const fetchNotesBySavedObjectSuccess = actionCreator<{
  savedObjectId: string;
  data: NormalizedEntities<TimelineNote>;
}>('FETCH_NOTES_BY_SAVED_OBJECT_ID_SUCCESS');

export const fetchNotesBySavedObjectFailure = actionCreator(
  'FETCH_NOTES_BY_SAVED_OBJECT_ID_FAILURE'
);

export const createNoteForDocumentRequest = actionCreator<{ documentId: string; note: BareNote }>(
  'CREATE_NOTE_FOR_DOCUMENT_REQUEST'
);

export const createNoteForDocumentSuccess = actionCreator<{
  documentId: string;
  data: NormalizedEntity<TimelineNote>;
}>('CREATE_NOTE_FOR_DOCUMENT_SUCCESS');

export const createNoteForDocumentFailure = actionCreator('CREATE_NOTE_FOR_DOCUMENT_FAILURE');

export const createNoteForTimelineRequest = actionCreator<{
  savedObjectId: string;
  note: BareNote;
}>('CREATE_NOTE_FOR_TIMELINE_REQUEST');

export const createNoteForTimelineSuccess = actionCreator<{
  savedObjectId: string;
  data: NormalizedEntity<TimelineNote>;
}>('CREATE_NOTE_FOR_TIMELINE_SUCCESS');

export const createNoteForTimelineFailure = actionCreator('CREATE_NOTE_FOR_TIMELINE_FAILURE');

export const createNoteForDocumentAndTimelineRequest = actionCreator<{
  documentId: string;
  savedObjectId: string;
  note: BareNote;
}>('CREATE_NOTE_FOR_DOCUMENT_AND_TIMELINE_REQUEST');

export const createNoteForDocumentAndTimelineSuccess = actionCreator<{
  documentId: string;
  savedObjectId: string;
  data: NormalizedEntity<TimelineNote>;
}>('CREATE_NOTE_FOR_DOCUMENT_AND_TIMELINE_SUCCESS');

export const createNoteForDocumentAndTimelineFailure = actionCreator(
  'CREATE_NOTE_FOR_DOCUMENT_AND_TIMELINE_FAILURE'
);

export const deleteNoteRequest = actionCreator<{
  note: TimelineNote;
}>('DELETE_NOTE_REQUEST');

export const deleteNoteSuccess = actionCreator<{
  noteId: string;
  documentId: string;
  savedObjectId: string;
}>('DELETE_NOTE_SUCCESS');

export const deleteNoteFailure = actionCreator<{ noteId: string }>('DELETE_NOTE_FAILURE');

export const addErrorHash = actionCreator<{
  id: string;
  hash: string;
  title: string;
  message: string[];
}>('ADD_ERROR_HASH');
