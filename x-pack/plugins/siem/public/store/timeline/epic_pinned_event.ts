/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { get, omit } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, Observable, empty } from 'rxjs';
import { filter, mergeMap, startWith, withLatestFrom, takeUntil } from 'rxjs/operators';

import { persistTimelinePinnedEventMutation } from '../../containers/timeline/pinned_event/persist.gql_query';
import { PersistTimelinePinnedEventMutation, PinnedEvent } from '../../graphql/types';

import {
  pinEvent,
  endTimelineSaving,
  unPinEvent,
  updateTimeline,
  startTimelineSaving,
} from './actions';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { refetchQueries } from './refetch_queries';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { TimelineById } from './types';

export const timelinePinnedEventActionsType = [pinEvent.type, unPinEvent.type];

export const epicPersistPinnedEvent = (
  apolloClient: ApolloClient<NormalizedCacheObject>,
  action: Action,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    apolloClient.mutate<
      PersistTimelinePinnedEventMutation.Mutation,
      PersistTimelinePinnedEventMutation.Variables
    >({
      mutation: persistTimelinePinnedEventMutation,
      fetchPolicy: 'no-cache',
      variables: {
        pinnedEventId:
          timeline[get('payload.id', action)].pinnedEventsSaveObject[
            get('payload.eventId', action)
          ] != null
            ? timeline[get('payload.id', action)].pinnedEventsSaveObject[
                get('payload.eventId', action)
              ].pinnedEventId
            : null,
        eventId: get('payload.eventId', action),
        timelineId: myEpicTimelineId.getTimelineId(),
      },
      refetchQueries,
    })
  ).pipe(
    withLatestFrom(timeline$),
    mergeMap(([result, recentTimeline]) => {
      const savedTimeline = recentTimeline[get('payload.id', action)];
      const response: PinnedEvent = get('data.persistPinnedEventOnTimeline', result);

      return [
        response != null
          ? updateTimeline({
              id: get('payload.id', action),
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
                pinnedEventsSaveObject: {
                  ...savedTimeline.pinnedEventsSaveObject,
                  [get('payload.eventId', action)]: response,
                },
              },
            })
          : updateTimeline({
              id: get('payload.id', action),
              timeline: {
                ...savedTimeline,
                pinnedEventsSaveObject: omit(
                  get('payload.eventId', action),
                  savedTimeline.pinnedEventsSaveObject
                ),
              },
            }),
        endTimelineSaving({
          id: get('payload.id', action),
        }),
      ];
    }),
    startWith(startTimelineSaving({ id: get('payload.id', action) })),
    takeUntil(
      action$.pipe(
        withLatestFrom(timeline$),
        filter(([checkAction, updatedTimeline]) => {
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

export const createTimelinePinnedEventEpic = <State>(): Epic<Action, Action, State> => action$ =>
  action$.pipe(
    filter(action => timelinePinnedEventActionsType.includes(action.type)),
    mergeMap(action => {
      dispatcherTimelinePersistQueue.next({ action });
      return empty();
    })
  );
