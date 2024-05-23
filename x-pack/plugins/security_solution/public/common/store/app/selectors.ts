/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys, values } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import type { Note } from '../../lib/note';
import type { ErrorModel, NotesById } from './model';
import type { State } from '../types';
import type { TimelineResultNote } from '../../../timelines/components/open_timeline/types';
import type { Note as TimelineNote } from '../../../../common/api/timeline';

export const selectNotesById = (state: State): NotesById => state.app.notesById;

const getErrors = (state: State): ErrorModel => state.app.errors;

export const getNotes = memoizeOne((notesById: NotesById, noteIds: string[]): Note[] =>
  keys(notesById).reduce((acc: Note[], noteId: string) => {
    if (noteIds.includes(noteId)) {
      const note: Note = notesById[noteId];
      return [...acc, note];
    }
    return acc;
  }, [])
);

export const getNotesAsCommentsList = (notesById: NotesById): TimelineResultNote[] =>
  values(notesById).map((note) => ({
    eventId: note.eventId,
    savedObjectId: note.saveObjectId,
    note: note.note,
    noteId: note.id,
    updated: (note.lastEdit ?? note.created).getTime(),
    updatedBy: note.user,
  }));

export const selectNotesByIdSelector = createSelector(
  selectNotesById,
  (notesById: NotesById) => notesById
);

export const notesByIdsSelector = () =>
  createSelector(selectNotesById, (notesById: NotesById) => notesById);

export const selectNotesAsCommentsListSelector = () =>
  createSelector(selectNotesById, getNotesAsCommentsList);

export const errorsSelector = () => createSelector(getErrors, (errors) => errors);

// new
const byId = (state: State): { [id: string]: TimelineNote } => state.app.byId;
export const selectById = createSelector(byId, (notes) => notes);

const allIds = (state: State): string[] => state.app.allIds;
export const selectAllIds = createSelector(allIds, (ids) => ids);

const idsByDocumentId = (state: State): { [documentId: string]: string[] } =>
  state.app.idsByDocumentId;
export const selectIdsByDocumentId = createSelector(idsByDocumentId, (ids) => ids);

export const idsBySavedObjectId = (state: State): { [objectId: string]: string[] } =>
  state.app.idsBySavedObjectId;
export const selectIdsBySavedObjectId = createSelector(idsBySavedObjectId, (ids) => ids);

const loadingFetchByDocument = (state: State): boolean => state.app.loadingFetchByDocument;
export const selectLoadingFetchByDocument = createSelector(
  loadingFetchByDocument,
  (loading) => loading
);

const errorFetchByDocument = (state: State): boolean => state.app.errorFetchByDocument;
export const selectErrorFetchByDocument = createSelector(errorFetchByDocument, (error) => error);

const loadingFetchBySavedObject = (state: State): boolean => state.app.loadingFetchBySavedObject;
export const selectLoadingFetchBySavedObject = createSelector(
  loadingFetchBySavedObject,
  (loading) => loading
);

const errorFetchBySavedObject = (state: State): boolean => state.app.errorFetchBySavedObject;
export const selectErrorFetchBySavedObject = createSelector(
  errorFetchBySavedObject,
  (error) => error
);

const loadingCreateForDocument = (state: State): boolean => state.app.loadingCreateForDocument;
export const selectLoadingCreateForDocument = createSelector(
  loadingCreateForDocument,
  (loading) => loading
);

const errorCreateForDocument = (state: State): boolean => state.app.errorCreateForDocument;
export const selectErrorCreateForDocument = createSelector(
  errorCreateForDocument,
  (error) => error
);

const loadingCreateForSavedObject = (state: State): boolean =>
  state.app.loadingCreateForSavedObject;
export const selectLoadingCreateForSavedObject = createSelector(
  loadingCreateForSavedObject,
  (loading) => loading
);

const errorCreateForSavedObject = (state: State): boolean => state.app.errorCreateForSavedObject;
export const selectErrorCreateForSavedObject = createSelector(
  errorCreateForSavedObject,
  (error) => error
);

const loadingCreateForDocumentAndForSavedObject = (state: State): boolean =>
  state.app.loadingCreateForDocumentAndForSavedObject;
export const selectLoadingCreateForDocumentAndForSavedObject = createSelector(
  loadingCreateForDocumentAndForSavedObject,
  (loading) => loading
);

const errorCreateForDocumentAndForSavedObject = (state: State): boolean =>
  state.app.errorCreateForDocumentAndForSavedObject;
export const selectErrorCreateForDocumentAndForSavedObject = createSelector(
  errorCreateForDocumentAndForSavedObject,
  (error) => error
);

const loadingDeleteNoteIds = (state: State): string[] => state.app.loadingDeleteNoteIds;
export const selectLoadingDeleteNoteIds = createSelector(
  loadingDeleteNoteIds,
  (loading) => loading
);

const errorDelete = (state: State): boolean => state.app.errorDelete;
export const selectErrorDelete = createSelector(errorDelete, (error) => error);
