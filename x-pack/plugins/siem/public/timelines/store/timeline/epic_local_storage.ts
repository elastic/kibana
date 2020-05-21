/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { merge } from 'rxjs';
import { map, filter, ignoreElements, tap, withLatestFrom } from 'rxjs/operators';
import { Epic, ofType } from 'redux-observable';
import { get } from 'lodash/fp';

import { createTimeline, updateTimeline, removeColumn, upsertColumn } from './actions';
import { TimelineEpicDependencies } from './epic';
import { isNotNull } from './helpers';
import { TimelineModel, ColumnHeaderOptions } from './model';

const isPageTimeline = (timelineId: string | undefined) =>
  timelineId && timelineId.toLowerCase() === 'alerts-table';

const removeColumnFromTimeline = (timeline: TimelineModel, columnId: string): TimelineModel => {
  return { ...timeline, columns: timeline.columns.filter(column => column.id !== columnId) };
};

const addColumnToTimeline = (
  timeline: TimelineModel,
  column: ColumnHeaderOptions
): TimelineModel => {
  return { ...timeline, columns: [...timeline.columns, column] };
};

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

  return merge(
    action$.pipe(
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
    ),
    action$.pipe(
      ofType(removeColumn.type),
      tap(action => {
        const storageTimelines = JSON.parse(localStorage.getItem('timelines') ?? '');
        const timelineId: string = get('payload.id', action);
        const columnId: string = get('payload.columnId', action);
        const modifiedTimeline = removeColumnFromTimeline(storageTimelines[timelineId], columnId);

        localStorage.setItem(
          'timelines',
          JSON.stringify({ ...storageTimelines, [timelineId]: modifiedTimeline })
        );
      }),
      ignoreElements()
    ),
    action$.pipe(
      ofType(upsertColumn.type),
      tap(action => {
        const storageTimelines = JSON.parse(localStorage.getItem('timelines') ?? '');
        const timelineId: string = get('payload.id', action);
        const column: ColumnHeaderOptions = get('payload.column', action);
        const modifiedTimeline = addColumnToTimeline(storageTimelines[timelineId], column);

        localStorage.setItem(
          'timelines',
          JSON.stringify({ ...storageTimelines, [timelineId]: modifiedTimeline })
        );
      }),
      ignoreElements()
    )
  );
};
