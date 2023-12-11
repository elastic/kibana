/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash/fp';
import type { Action } from 'redux';
import type { Epic } from 'redux-observable';
import type { Observable } from 'rxjs';
import { from, EMPTY } from 'rxjs';
import { filter, mergeMap, startWith, withLatestFrom, takeUntil } from 'rxjs/operators';

import { addError } from '../../../common/store/app/actions';
import type { inputsModel } from '../../../common/store/inputs';
import type { PinnedEventResponse } from '../../../../common/api/timeline';
import {
  pinEvent,
  endTimelineSaving,
  unPinEvent,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from './actions';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import type { TimelineById } from './types';
import { persistPinnedEvent } from '../../containers/pinned_event/api';

type PinnedEventAction = ReturnType<typeof pinEvent | typeof unPinEvent>;

const timelinePinnedEventActionsType = new Set([pinEvent.type, unPinEvent.type]);

export function isPinnedEventAction(action: Action): action is PinnedEventAction {
  return timelinePinnedEventActionsType.has(action.type);
}

export const epicPersistPinnedEvent = (
  action: PinnedEventAction,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>,
  allTimelineQuery$: Observable<inputsModel.GlobalQuery>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    persistPinnedEvent({
      pinnedEventId:
        timeline[action.payload.id].pinnedEventsSaveObject[action.payload.eventId] != null
          ? timeline[action.payload.id].pinnedEventsSaveObject[action.payload.eventId].pinnedEventId
          : null,
      eventId: action.payload.eventId,
      timelineId: myEpicTimelineId.getTimelineId(),
    })
  ).pipe(
    withLatestFrom(timeline$, allTimelineQuery$),
    mergeMap(([result, recentTimeline, allTimelineQuery]) => {
      const savedTimeline = recentTimeline[action.payload.id];
      const response: PinnedEventResponse = get('data.persistPinnedEventOnTimeline', result);
      const callOutMsg = response && response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

      if (allTimelineQuery.refetch != null) {
        (allTimelineQuery.refetch as inputsModel.Refetch)();
      }

      return [
        response != null
          ? updateTimeline({
              id: action.payload.id,
              timeline: {
                ...savedTimeline,
                savedObjectId:
                  savedTimeline.savedObjectId == null && response.timelineId != null
                    ? response.timelineId
                    : savedTimeline.savedObjectId,
                version:
                  savedTimeline.version == null && response.timelineVersion != null
                    ? response.timelineVersion
                    : savedTimeline.version,
                pinnedEventIds: {
                  ...savedTimeline.pinnedEventIds,
                  [action.payload.eventId]: true,
                },
                pinnedEventsSaveObject: {
                  ...savedTimeline.pinnedEventsSaveObject,
                  [action.payload.eventId]: response,
                },
              },
            })
          : updateTimeline({
              id: action.payload.id,
              timeline: {
                ...savedTimeline,
                pinnedEventIds: omit(action.payload.eventId, savedTimeline.pinnedEventIds),
                pinnedEventsSaveObject: omit(
                  action.payload.eventId,
                  savedTimeline.pinnedEventsSaveObject
                ),
              },
            }),
        ...callOutMsg,
        endTimelineSaving({
          id: action.payload.id,
        }),
      ].filter(Boolean);
    }),
    startWith(startTimelineSaving({ id: action.payload.id })),
    takeUntil(
      action$.pipe(
        withLatestFrom(timeline$),
        filter(([checkAction, updatedTimeline]) => {
          if (checkAction.type === addError.type) {
            return true;
          }
          if (
            checkAction.type === endTimelineSaving.type &&
            updatedTimeline[get('payload.id', checkAction)].savedObjectId != null
          ) {
            myEpicTimelineId.setTimelineId(
              updatedTimeline[get('payload.id', checkAction)].savedObjectId
            );
            myEpicTimelineId.setTimelineVersion(
              updatedTimeline[get('payload.id', checkAction)].version
            );
            return true;
          }
          return false;
        })
      )
    )
  );

export const createTimelinePinnedEventEpic =
  <State>(): Epic<Action, Action, State> =>
  (action$) =>
    action$.pipe(
      filter(isPinnedEventAction),
      mergeMap((action) => {
        dispatcherTimelinePersistQueue.next({ action });
        return EMPTY;
      })
    );
