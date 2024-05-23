/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';

import {appActions } from '../../../common/store/app';
import type { State } from '../../../common/store/types';
import { setEventIdsToFetchNotesFor } from '../../../common/store/app/actions';
import type { Note } from '../../../common/lib/note';
import { getNotesByIds } from '../../containers/notes/api';

export const displayUnassociatedNotesMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    // perform the action
    const ret = next(action);

    if (action.type === setEventIdsToFetchNotesFor.type) {
      const eventIds = action.payload.eventIds;
      console.log('hello from middleware', eventIds);
      store.dispatch(appActions.setNonTimelineEventNotesLoading({ isLoading: true }));

      try {
        const response = await getNotesByIds(eventIds);
        const notes: Note[] = response.notes;
        console.log('notes', notes);
        store.dispatch(appActions.serverReturnedNonAssociatedNotes({ notes }));
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
      store.dispatch(appActions.setNonTimelineEventNotesLoading({ isLoading: false }));
    }

    return ret;
  };
