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
import {
  pinEvent,
  endTimelineSaving,
  unPinEvent,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from '../actions';
import { persistPinnedEvent } from '../../containers/pinned_event/api';
import { refreshTimelines } from './helpers';

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
          timelineId: timeline.id,
        });

        const response: PinnedEventResponse = get('data.persistPinnedEventOnTimeline', result);
        if (response && response.code === 403) {
          store.dispatch(showCallOutUnauthorizedMsg());
        }

        refreshTimelines(store.getState());

        // The response is null in case we unpinned an event.
        // In that case we want to remove the locally pinned event.
        if (!response) {
          store.dispatch(
            updateTimeline({
              id: action.payload.id,
              timeline: {
                ...timeline,
                pinnedEventIds: omit(eventId, timeline.pinnedEventIds),
                pinnedEventsSaveObject: omit(eventId, timeline.pinnedEventsSaveObject),
              },
            })
          );
        } else {
          store.dispatch(
            updateTimeline({
              id: action.payload.id,
              timeline: {
                ...timeline,
                pinnedEventIds: {
                  ...timeline.pinnedEventIds,
                  [eventId]: true,
                },
                pinnedEventsSaveObject: {
                  ...timeline.pinnedEventsSaveObject,
                  [eventId]: response,
                },
              },
            })
          );
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
