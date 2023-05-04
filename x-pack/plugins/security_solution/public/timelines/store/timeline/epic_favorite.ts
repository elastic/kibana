/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { Action } from 'redux';
import type { Epic } from 'redux-observable';
import type { Observable } from 'rxjs';
import { from, empty } from 'rxjs';
import { filter, mergeMap, withLatestFrom, startWith, takeUntil } from 'rxjs/operators';

import { addError } from '../../../common/store/app/actions';
import {
  endTimelineSaving,
  updateIsFavorite,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from './actions';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { myEpicTimelineId } from './my_epic_timeline_id';
import type { ActionTimeline, TimelineById } from './types';
import type { inputsModel } from '../../../common/store/inputs';
import type { ResponseFavoriteTimeline } from '../../../../common/types/timeline';
import { TimelineType } from '../../../../common/types/timeline';
import { persistFavorite } from '../../containers/api';

export const timelineFavoriteActionsType = [updateIsFavorite.type];

export const epicPersistTimelineFavorite = (
  action: ActionTimeline,
  timeline: TimelineById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>,
  allTimelineQuery$: Observable<inputsModel.GlobalQuery>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    persistFavorite({
      timelineId: myEpicTimelineId.getTimelineId(),
      templateTimelineId: timeline[action.payload.id].templateTimelineId,
      templateTimelineVersion: timeline[action.payload.id].templateTimelineVersion,
      timelineType: timeline[action.payload.id].timelineType ?? TimelineType.default,
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
            myEpicTimelineId.setTemplateTimelineId(
              updatedTimeline[get('payload.id', checkAction)].templateTimelineId
            );
            myEpicTimelineId.setTemplateTimelineVersion(
              updatedTimeline[get('payload.id', checkAction)].templateTimelineVersion
            );
            return true;
          }
          return false;
        })
      )
    )
  );

export const createTimelineFavoriteEpic =
  <State>(): Epic<Action, Action, State> =>
  (action$) => {
    return action$.pipe(
      filter((action) => timelineFavoriteActionsType.includes(action.type)),
      mergeMap((action) => {
        dispatcherTimelinePersistQueue.next({ action });
        return empty();
      })
    );
  };
