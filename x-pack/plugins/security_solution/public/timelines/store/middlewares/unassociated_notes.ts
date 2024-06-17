/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';

import type { Note } from '../../../../common/api/timeline';
import type { NormalizedEntities, NormalizedEntity } from '../normalize';
import { normalizeEntities, normalizeEntity } from '../normalize';
import { appActions } from '../../../common/store/app';
import type { State } from '../../../common/store/types';
import {
  deleteNote,
  fetchNotesByDocumentId,
  fetchNotesByDocumentIds,
  fetchNotesBySavedObjectIdId,
  persistNote,
} from '../../containers/notes/api';

function isFetchNotesByDocumentRequest(
  action: Action
): action is ReturnType<typeof appActions.fetchNotesByDocumentRequest> {
  return action.type === appActions.fetchNotesByDocumentRequest.type;
}

function isFetchNotesBySavedObjectRequest(
  action: Action
): action is ReturnType<typeof appActions.fetchNotesBySavedObjectRequest> {
  return action.type === appActions.fetchNotesBySavedObjectRequest.type;
}

function isFetchNotesByDocumentsRequest(
  action: Action
): action is ReturnType<typeof appActions.fetchNotesByDocumentsRequest> {
  return action.type === appActions.fetchNotesByDocumentsRequest.type;
}

function isCreateNoteForDocumentRequest(
  action: Action
): action is ReturnType<typeof appActions.createNoteForDocumentRequest> {
  return action.type === appActions.createNoteForDocumentRequest.type;
}

function isCreateNoteForTimelineRequest(
  action: Action
): action is ReturnType<typeof appActions.createNoteForTimelineRequest> {
  return action.type === appActions.createNoteForTimelineRequest.type;
}

function isCreateNoteForDocumentAndTimelineRequest(
  action: Action
): action is ReturnType<typeof appActions.createNoteForDocumentAndTimelineRequest> {
  return action.type === appActions.createNoteForDocumentAndTimelineRequest.type;
}

function isDeleteNoteRequest(
  action: Action
): action is ReturnType<typeof appActions.deleteNoteRequest> {
  return action.type === appActions.deleteNoteRequest.type;
}

export const displayUnassociatedNotesMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    // perform the action
    const ret = next(action);

    if (isFetchNotesByDocumentRequest(action)) {
      const documentId = action.payload.documentId;

      try {
        const response = await fetchNotesByDocumentId(documentId);
        const res: Note[] = response.notes;
        const data: NormalizedEntities<Note> = normalizeEntities(res);
        store.dispatch(appActions.fetchNotesByDocumentSuccess({ documentId, data }));
      } catch (error) {
        store.dispatch(appActions.fetchNotesByDocumentFailure());
      }
    }

    if (isFetchNotesBySavedObjectRequest(action)) {
      const savedObjectId = action.payload.savedObjectId;

      try {
        const response = await fetchNotesBySavedObjectIdId(savedObjectId);
        const res: Note[] = response.notes;
        const data: NormalizedEntities<Note> = normalizeEntities(res);
        store.dispatch(appActions.fetchNotesBySavedObjectSuccess({ savedObjectId, data }));
      } catch (error) {
        store.dispatch(appActions.fetchNotesBySavedObjectFailure());
      }
    }

    if (isFetchNotesByDocumentsRequest(action)) {
      const documentIds = action.payload.documentIds;

      try {
        const response = await fetchNotesByDocumentIds(documentIds);
        const res: Note[] = response.notes;
        const data: NormalizedEntities<Note> = normalizeEntities(res);
        store.dispatch(appActions.fetchNotesByDocumentsSuccess({ documentIds, data }));
      } catch (error) {
        store.dispatch(appActions.fetchNotesByDocumentsFailure());
      }
    }

    if (isCreateNoteForDocumentRequest(action)) {
      const { documentId, note } = action.payload;

      try {
        const response = await persistNote({ note });
        const res: Note = response.data.persistNote.note;
        const data: NormalizedEntity<Note> = normalizeEntity(res);
        store.dispatch(appActions.createNoteForDocumentSuccess({ documentId, data }));
      } catch (error) {
        store.dispatch(appActions.createNoteForDocumentFailure());
      }
    }

    if (isCreateNoteForTimelineRequest(action)) {
      const { savedObjectId, note } = action.payload;

      try {
        const response = await persistNote({ note });
        const res: Note = response.data.persistNote.note;
        const data: NormalizedEntity<Note> = normalizeEntity(res);
        store.dispatch(appActions.createNoteForTimelineSuccess({ savedObjectId, data }));
      } catch (error) {
        store.dispatch(appActions.createNoteForTimelineFailure());
      }
    }

    if (isCreateNoteForDocumentAndTimelineRequest(action)) {
      const { documentId, savedObjectId, note } = action.payload;

      try {
        const response = await persistNote({ note });
        const res: Note = response.data.persistNote.note;
        const data: NormalizedEntity<Note> = normalizeEntity(res);
        store.dispatch(
          appActions.createNoteForDocumentAndTimelineSuccess({ documentId, savedObjectId, data })
        );
      } catch (error) {
        store.dispatch(appActions.createNoteForDocumentAndTimelineFailure());
      }
    }

    if (isDeleteNoteRequest(action)) {
      const { noteId, eventId, timelineId } = action.payload.note;

      try {
        await deleteNote(noteId);
        store.dispatch(
          appActions.deleteNoteSuccess({
            noteId,
            documentId: eventId || '',
            savedObjectId: timelineId,
          })
        );
      } catch (error) {
        store.dispatch(appActions.deleteNoteFailure({ noteId }));
      }
    }

    return ret;
  };
