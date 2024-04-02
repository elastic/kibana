/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash/fp';
import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';

import type { State } from '../../../common/store/types';
import { selectTimelineById } from '../selectors';
import * as i18n from '../../pages/translations';
import type { PinnedEventResponse } from '../../../../common/api/timeline';
import { TimelineStatus } from '../../../../common/api/timeline';
import {
  pinEvent,
  endTimelineSaving,
  unPinEvent,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
  saveTimeline,
} from '../actions';
import { persistPinnedEvent } from '../../containers/pinned_event/api';
import { refreshTimelines } from './helpers';
import { UNTITLED_TIMELINE } from '../../components/open_timeline/translations';

type PinnedEventAction = ReturnType<typeof pinEvent | typeof unPinEvent>;

const timelinePinnedEventActionsType = new Set([pinEvent.type, unPinEvent.type]);

function isPinnedEventAction(action: Action): action is PinnedEventAction {
  return timelinePinnedEventActionsType.has(action.type);
}

export const addPinnedEventToTimelineMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    // perform the action
    const ret = next(action);

    if (isPinnedEventAction(action)) {
      const { id: localTimelineId, eventId } = action.payload;
      const timeline = selectTimelineById(store.getState(), localTimelineId);

      store.dispatch(startTimelineSaving({ id: localTimelineId }));

      try {
        const result = await persistPinnedEvent({
          pinnedEventId:
            timeline.pinnedEventsSaveObject[eventId] != null
              ? timeline.pinnedEventsSaveObject[eventId].pinnedEventId
              : null,
          eventId,
          timelineId: timeline.savedObjectId,
        });

        const response: PinnedEventResponse = get('data.persistPinnedEventOnTimeline', result);
        if (response && response.code === 403) {
          store.dispatch(showCallOutUnauthorizedMsg());
        }

        refreshTimelines(store.getState());

        const currentTimeline = selectTimelineById(store.getState(), action.payload.id);
        // The response is null in case we unpinned an event.
        // In that case we want to remove the locally pinned event.
        if (!response) {
          return store.dispatch(
            updateTimeline({
              id: action.payload.id,
              timeline: {
                ...currentTimeline,
                pinnedEventIds: omit(eventId, currentTimeline.pinnedEventIds),
                pinnedEventsSaveObject: omit(eventId, currentTimeline.pinnedEventsSaveObject),
              },
            })
          );
        } else {
          const updatedTimeline = {
            ...currentTimeline,
            pinnedEventIds: {
              ...currentTimeline.pinnedEventIds,
              [eventId]: true,
            },
            pinnedEventsSaveObject: {
              ...currentTimeline.pinnedEventsSaveObject,
              [eventId]: response,
            },
          };

          await store.dispatch(
            updateTimeline({
              id: action.payload.id,
              timeline: updatedTimeline,
            })
          );

          // In case a note was added to an unsaved timeline, we need to make sure to update the timeline
          // locally and then remotely again in order not to lose the SO associations.
          // This also involves setting the status and the default title.
          if (!timeline.savedObjectId && response.timelineId && response.timelineVersion) {
            await store.dispatch(
              updateTimeline({
                id: action.payload.id,
                timeline: {
                  ...updatedTimeline,
                  savedObjectId: response.timelineId,
                  version: response.timelineVersion || updatedTimeline.version,
                  status: TimelineStatus.active,
                  title: currentTimeline.title || UNTITLED_TIMELINE,
                },
              })
            );
            await store.dispatch(saveTimeline({ id: action.payload.id, saveAsNew: false }));
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
