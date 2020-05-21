/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { map, filter, ignoreElements, tap, merge, withLatestFrom } from 'rxjs/operators';
import { Epic, ofType } from 'redux-observable';
import { get } from 'lodash/fp';

import { createTimeline, updateTimeline } from './actions';
import { TimelineEpicDependencies } from './epic';
import { isNotNull } from './helpers';
import { TimelineModel } from './model';

const isPageTimeline = (timelineId: string | undefined) =>
  timelineId && timelineId.toLowerCase() === 'alerts-table';

export const createTimelineLocalStorageEpic = <State>(): Epic<
  Action,
  Action,
  State,
  TimelineEpicDependencies<State>
> => (
  action$,
  state$,
  {
    selectAllTimelineQuery,
    selectNotesByIdSelector,
    timelineByIdSelector,
    timelineTimeRangeSelector,
    apolloClient$,
  }
) => {
  const timeline$ = state$.pipe(map(timelineByIdSelector), filter(isNotNull));

  return action$.pipe(
    ofType(createTimeline.type),
    withLatestFrom(timeline$),
    filter(([action, timeline]) => {
      const timelineId: string = get('payload.id', action);

      if (isPageTimeline(timelineId)) {
        return true;
      }

      return false;
    }),
    tap(([action, timeline]) => {
      const storageTimelines = localStorage.getItem('timelines');
      const timelineId: string = get('payload.id', action);

      if (!storageTimelines) {
        localStorage.setItem(
          'timelines',
          JSON.stringify({
            [timelineId]: action.payload,
          })
        );
      }
    }),
    map(([action, timeline]) => {
      const storageTimelines = JSON.parse(localStorage.getItem('timelines') ?? '');
      const timelineId: string = get('payload.id', action);

      return updateTimeline({
        id: timelineId,
        timeline: { ...timeline[timelineId], ...storageTimelines[timelineId] },
      });
    })
  );
};
