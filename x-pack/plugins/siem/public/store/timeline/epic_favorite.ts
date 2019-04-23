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
import { filter, mergeMap, startWith, withLatestFrom } from 'rxjs/operators';

import { persistTimelineFavoriteMutation } from '../../containers/timeline/favorite/persist.gql_query';
import { PersistTimelineFavoriteMutation, ResponseFavoriteTimeline } from '../../graphql/types';

import { updateIsFavorite, updateIsSaving, updateTimeline } from './actions';
import { TimelineById } from './reducer';
import { dispatcherTimelinePersistQueue, refetchQueries } from './epic';

export const timelineFavoriteActionsType = [updateIsFavorite.type];

export const epicPersistTimelineFavorite = (
  apolloClient: ApolloClient<NormalizedCacheObject>,
  action: Action,
  timeline: TimelineById,
  timeline$: Observable<TimelineById>
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
        timelineId: timeline[get('payload.id', action)].savedObjectId,
      },
      refetchQueries,
    })
  ).pipe(
    withLatestFrom(timeline$),
    mergeMap(([result, recentTimelines]) => {
      const savedTimeline = recentTimelines[get('payload.id', action)];
      const response: ResponseFavoriteTimeline = get('data.persistFavorite', result);
      return [
        updateTimeline({
          id: get('payload.id', action),
          timeline: {
            ...savedTimeline,
            isFavorite: response.favorite != null && response.favorite.length > 0,
            savedObjectId: response.savedObjectId || null,
            version: response.version || null,
          },
        }),
        updateIsSaving({
          id: get('payload.id', action),
          isSaving: false,
        }),
      ];
    }),
    startWith(updateIsSaving({ id: get('payload.id', action), isSaving: true }))
  );

export const createTimelineFavoriteEpic = <State>(): Epic<Action, Action, State> => action$ => {
  return action$.pipe(
    filter(action => timelineFavoriteActionsType.includes(action.type)),
    mergeMap(action => {
      dispatcherTimelinePersistQueue.next({ action });
      return empty();
    })
  );
};
