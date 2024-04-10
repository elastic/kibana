/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';

import { appSelectors } from '../../../common/store/app';
import type { NotesById } from '../../../common/store/app/model';
import type { State } from '../../../common/store/types';
import { updateNote } from '../../../common/store/app/actions';
import {
  addNote,
  addNoteToEvent,
  endTimelineSaving,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
  pinEvent,
} from '../actions';
import { persistNote } from '../../containers/notes/api';
import type { ResponseNote } from '../../../../common/api/timeline';
import { selectTimelineById } from '../selectors';
import * as i18n from '../../pages/translations';
import { ensureTimelineIsSaved, refreshTimelines } from './helpers';

type NoteAction = ReturnType<typeof addNote | typeof addNoteToEvent>;

const timelineNoteActionsType = new Set([addNote.type, addNoteToEvent.type]);

function isNoteAction(action: Action): action is NoteAction {
  return timelineNoteActionsType.has(action.type);
}

function isAddNoteToEventAction(action: Action): action is ReturnType<typeof addNoteToEvent> {
  return action.type === addNoteToEvent.type;
}

export const addNoteToTimelineMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    // perform the action
    const ret = next(action);

    if (isNoteAction(action)) {
      const { id: localTimelineId, noteId: localNoteId } = action.payload;
      const notes = appSelectors.selectNotesByIdSelector(store.getState());

      store.dispatch(startTimelineSaving({ id: localTimelineId }));

      try {
        // In case a note is being added to an unsaved timeline, we need to make sure
        // the timeline has been saved or is in draft state. Otherwise, `timelineId` will be `null`
        // and we're creating orphaned notes.
        const timeline = await ensureTimelineIsSaved({
          localTimelineId,
          timeline: selectTimelineById(store.getState(), localTimelineId),
          store,
        });

        if (!timeline.savedObjectId) {
          throw new Error('Cannot create note without a timelineId');
        }

        const result = await persistNote({
          noteId: null,
          version: null,
          note: {
            eventId: 'eventId' in action.payload ? action.payload.eventId : undefined,
            note: getNoteText(localNoteId, notes),
            timelineId: timeline.savedObjectId,
          },
        });

        const response: ResponseNote = get('data.persistNote', result);
        if (response.code === 403) {
          store.dispatch(showCallOutUnauthorizedMsg());
        }

        refreshTimelines(store.getState());

        await store.dispatch(
          updateNote({
            note: {
              ...notes[localNoteId],
              created:
                response.note.updated != null
                  ? new Date(response.note.updated)
                  : notes[localNoteId].created,
              user:
                response.note.updatedBy != null ? response.note.updatedBy : notes[localNoteId].user,
              saveObjectId: response.note.noteId,
              version: response.note.version,
            },
          })
        );

        const currentTimeline = selectTimelineById(store.getState(), localTimelineId);

        // Automatically pin an associated event if it's not pinned yet
        if (isAddNoteToEventAction(action)) {
          const isEventPinned = currentTimeline.pinnedEventIds[action.payload.eventId] === true;
          if (!isEventPinned) {
            await store.dispatch(
              pinEvent({
                id: localTimelineId,
                eventId: action.payload.eventId,
              })
            );
          }
        }
      } catch (error) {
        kibana.notifications.toasts.addDanger({
          title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
          text: error?.message ?? i18n.UPDATE_TIMELINE_ERROR_TEXT,
        });
      } finally {
        store.dispatch(
          endTimelineSaving({
            id: localTimelineId,
          })
        );
      }
    }

    return ret;
  };

const getNoteText = (noteId: string | undefined | null, notes: NotesById): string => {
  if (noteId != null) {
    return notes[noteId].note;
  }
  return '';
};
