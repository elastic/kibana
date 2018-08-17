/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic, EpicWithState } from 'redux-observable';
import { merge } from 'rxjs';
import { exhaustMap, filter, map } from 'rxjs/operators';

import { loadSummary, reportVisibleSummary } from './actions';
import { loadSummaryEpic } from './load_operation';

const LOAD_BUCKETS_PER_PAGE = 100;
const MINIMUM_BUCKETS_PER_PAGE = 90;
const MINIMUM_BUFFER_PAGES = 0.5;

export const createLogSummaryEpic = <State>() =>
  combineEpics(createSummaryEffectsEpic<State>(), loadSummaryEpic as EpicWithState<
    typeof loadSummaryEpic,
    State
  >);

export const createSummaryEffectsEpic = <State>(): Epic<Action, Action, State, {}> => (
  action$,
  state$,
  {}
) => {
  const shouldLoadBetween$ = action$.pipe(
    filter(reportVisibleSummary.match),
    filter(
      ({ payload: { bucketsOnPage, pagesBeforeStart, pagesAfterEnd } }) =>
        bucketsOnPage < MINIMUM_BUCKETS_PER_PAGE ||
        pagesBeforeStart < MINIMUM_BUFFER_PAGES ||
        pagesAfterEnd < MINIMUM_BUFFER_PAGES
    ),
    map(({ payload: { start, end, pagesBeforeStart, pagesAfterEnd } }) => ({
      start: start - (end - start),
      end: end + (end - start),
      bucketSize: (end - start) / LOAD_BUCKETS_PER_PAGE,
    }))
  );

  return merge(
    shouldLoadBetween$.pipe(
      exhaustMap(({ start, end, bucketSize }) => [
        loadSummary({ start, end, sourceId: 'default', bucketSize }),
      ])
    )
  );
};
