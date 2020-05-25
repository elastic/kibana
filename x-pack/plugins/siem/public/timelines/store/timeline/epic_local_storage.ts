/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { merge } from 'rxjs';
import { map, filter, ignoreElements, tap, withLatestFrom } from 'rxjs/operators';
import { Epic, ofType } from 'redux-observable';
import { get, isEmpty } from 'lodash/fp';

import {
  createTimeline,
  updateTimeline,
  removeColumn,
  upsertColumn,
  applyDeltaToColumnWidth,
  updateColumns,
  updateItemsPerPage,
  updateSort,
} from './actions';
import { TimelineEpicDependencies } from './epic';
import {
  isNotNull,
  applyDeltaToTimelineColumnWidth,
  updateTimelineColumns,
  updateTimelineItemsPerPage,
  updateTimelineSort,
  removeTimelineColumn,
  upsertTimelineColumn,
} from './helpers';
import { TimelineModel, ColumnHeaderOptions } from './model';
import { Sort } from '../../components/timeline/body/sort';

const timelinePageIds = ['alerts-table', 'signals-page'];

const isPageTimeline = (timelineId: string | undefined): boolean =>
  !!(timelineId && timelinePageIds.includes(timelineId));

const isItAtimelineAction = (timelineId: string | undefined): boolean =>
  !!(timelineId && timelineId.toLowerCase().startsWith('timeline'));

const getAllTimelinesFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem('timelines') ?? `{}`);
};

const addTimelineToLocalStorage = (id: string, timeline: TimelineModel) => {
  const timelines = getAllTimelinesFromLocalStorage();
  localStorage.setItem(
    'timelines',
    JSON.stringify({
      ...timelines,
      [id]: timeline,
    })
  );
};

export const createTimelineLocalStorageEpic = <State>(): Epic<
  Action,
  Action,
  State,
  TimelineEpicDependencies<State>
> => (action$, state$, { timelineByIdSelector }) => {
  const timeline$ = state$.pipe(map(timelineByIdSelector), filter(isNotNull));

  return merge(
    action$.pipe(
      ofType(createTimeline.type),
      withLatestFrom(timeline$),
      filter(([action]) => isPageTimeline(get('payload.id', action))),
      tap(([action]) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const timeline: TimelineModel = get('payload', action);

        if (isEmpty(storageTimelines) || isEmpty(storageTimelines[timelineId])) {
          addTimelineToLocalStorage(timelineId, timeline);
        }
      }),
      map(([action, timeline]) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);

        return updateTimeline({
          id: timelineId,
          timeline: { ...timeline[timelineId], ...storageTimelines[timelineId] },
        });
      })
    ),
    action$.pipe(
      ofType(removeColumn.type),
      filter((action) => isPageTimeline(get('payload.id', action))),
      tap((action) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const columnId: string = get('payload.columnId', action);
        const timelines = removeTimelineColumn({
          id: timelineId,
          columnId,
          timelineById: storageTimelines,
        });

        addTimelineToLocalStorage(timelineId, timelines[timelineId]);
      }),
      ignoreElements()
    ),
    action$.pipe(
      ofType(upsertColumn.type),
      filter((action) => isPageTimeline(get('payload.id', action))),
      tap((action) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const column: ColumnHeaderOptions = get('payload.column', action);
        const index: number = get('payload.index', action);
        const timelines = upsertTimelineColumn({
          id: timelineId,
          column,
          index,
          timelineById: storageTimelines,
        });

        addTimelineToLocalStorage(timelineId, timelines[timelineId]);
      }),
      ignoreElements()
    ),
    action$.pipe(
      ofType(applyDeltaToColumnWidth.type),
      filter((action) => isPageTimeline(get('payload.id', action))),
      tap((action) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const columnId: string = get('payload.columnId', action);
        const delta: number = get('payload.delta', action);
        const timelines = applyDeltaToTimelineColumnWidth({
          id: timelineId,
          columnId,
          delta,
          timelineById: storageTimelines,
        });

        addTimelineToLocalStorage(timelineId, timelines[timelineId]);
      }),
      ignoreElements()
    ),
    action$.pipe(
      ofType(updateColumns.type),
      filter((action) => isPageTimeline(get('payload.id', action))),
      tap((action) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const columns: ColumnHeaderOptions[] = get('payload.columns', action);
        const timelines = updateTimelineColumns({
          id: timelineId,
          columns,
          timelineById: storageTimelines,
        });

        addTimelineToLocalStorage(timelineId, timelines[timelineId]);
      }),
      ignoreElements()
    ),
    action$.pipe(
      ofType(updateItemsPerPage.type),
      filter((action) => isPageTimeline(get('payload.id', action))),
      tap((action) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const itemsPerPage: number = get('payload.itemsPerPage', action);
        const timelines = updateTimelineItemsPerPage({
          id: timelineId,
          itemsPerPage,
          timelineById: storageTimelines,
        });
        addTimelineToLocalStorage(timelineId, timelines[timelineId]);
      }),
      ignoreElements()
    ),
    action$.pipe(
      ofType(updateSort.type),
      filter((action) => isPageTimeline(get('payload.id', action))),
      tap((action) => {
        const storageTimelines = getAllTimelinesFromLocalStorage();
        const timelineId: string = get('payload.id', action);
        const sort: Sort = get('payload.sort', action);
        const timelines = updateTimelineSort({
          id: timelineId,
          sort,
          timelineById: storageTimelines,
        });
        addTimelineToLocalStorage(timelineId, timelines[timelineId]);
      }),
      ignoreElements()
    )
  );
};
