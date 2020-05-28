/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { merge } from 'rxjs';
import { map, filter, ignoreElements, tap, withLatestFrom, delay } from 'rxjs/operators';
import { Epic } from 'redux-observable';
import { get } from 'lodash/fp';

import {
  removeColumn,
  upsertColumn,
  applyDeltaToColumnWidth,
  updateColumns,
  updateItemsPerPage,
  updateSort,
} from './actions';
import { TimelineEpicDependencies } from './types';
import { isNotNull } from './helpers';
import { addTimeline } from '../../../common/lib/local_storage';

const timelineActionTypes = [
  removeColumn.type,
  upsertColumn.type,
  applyDeltaToColumnWidth.type,
  updateColumns.type,
  updateItemsPerPage.type,
  updateSort.type,
];

const isPageTimeline = (timelineId: string | undefined): boolean =>
  // Is not a flyout timeline
  !(timelineId && timelineId.toLowerCase().startsWith('timeline'));

export const createTimelineLocalStorageEpic = <State>(): Epic<
  Action,
  Action,
  State,
  TimelineEpicDependencies<State>
> => (action$, state$, { timelineByIdSelector }) => {
  const timeline$ = state$.pipe(map(timelineByIdSelector), filter(isNotNull));

  return merge(
    action$.pipe(
      delay(500),
      withLatestFrom(timeline$),
      filter(([action]) => isPageTimeline(get('payload.id', action))),
      tap(([action, timelineById]) => {
        if (timelineActionTypes.includes(action.type)) {
          const timelineId: string = get('payload.id', action);
          addTimeline(timelineId, timelineById[timelineId]);
        }
      }),
      ignoreElements()
    )
  );
};
