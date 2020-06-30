/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { get } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, Observable, empty } from 'rxjs';
import { filter, mergeMap, withLatestFrom, startWith, takeUntil } from 'rxjs/operators';

import { persistTimelineFavoriteMutation } from '../../containers/favorite/persist.gql_query';
import { PersistTimelineFavoriteMutation, ResponseFavoriteTimeline } from '../../../graphql/types';
import { addError } from '../../../common/store/app/actions';
import {
  endTimelineSaving,
  updateIsFavorite,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from './actions';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { refetchQueries } from './refetch_queries';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { ActionTimeline, TimelineById } from './types';
import { inputsModel } from '../../../common/store/inputs';

export const timelineFavoriteActionsType = [updateIsFavorite.type];

export const epicPersistTimelineFavorite = (
  apolloClient: ApolloClient<NormalizedCacheObject>,
  action: ActionTimeline,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>,
  allTimelineQuery$: Observable<inputsModel.GlobalQuery>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    apolloClient.mutate<
      PersistTimelineFavoriteMutation.Mutation,
      PersistTimelineFavoriteMutation.Variables
    >({
      mutation: persistTimelineFavoriteMutation,
      fetchPolicy: 'no-cache',
      variables: {
        timelineId: myEpicTimelineId.getTimelineId(),
      },
      refetchQueries,
    })
  ).pipe(
    withLatestFrom(timeline$, allTimelineQuery$),
    mergeMap(([result, recentTimelines, allTimelineQuery]) => {
      const savedTimeline = recentTimelines[action.payload.id];
      const response: ResponseFavoriteTimeline = get('data.persistFavorite', result);
      const callOutMsg = response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

      if (allTimelineQuery.refetch != null) {
        (allTimelineQuery.refetch as inputsModel.Refetch)();
      }

      return [
        ...callOutMsg,
        updateTimeline({
          id: action.payload.id,
          timeline: {
            ...savedTimeline,
            isFavorite: response.favorite != null && response.favorite.length > 0,
            savedObjectId: response.savedObjectId || null,
            version: response.version || null,
          },
        }),
        endTimelineSaving({
          id: action.payload.id,
        }),
      ];
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

export const createTimelineFavoriteEpic = <State>(): Epic<Action, Action, State> => (action$) => {
  return action$.pipe(
    filter((action) => timelineFavoriteActionsType.includes(action.type)),
    mergeMap((action) => {
      dispatcherTimelinePersistQueue.next({ action });
      return empty();
    })
  );
};
