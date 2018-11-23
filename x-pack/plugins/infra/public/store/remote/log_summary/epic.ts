/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic, EpicWithState } from 'redux-observable';
import { merge } from 'rxjs';
import { exhaustMap, filter, map, withLatestFrom } from 'rxjs/operators';

import { logFilterActions, logPositionActions } from '../..';
import { loadSummary } from './actions';
import { loadSummaryEpic } from './operations/load';

const LOAD_BUCKETS_PER_PAGE = 100;
const MINIMUM_BUCKETS_PER_PAGE = 90;
const MINIMUM_BUFFER_PAGES = 0.5;

interface ManageSummaryDependencies<State> {
  selectLogFilterQueryAsJson: (state: State) => string | null;
  selectVisibleLogSummary: (
    state: State
  ) => {
    start: number | null;
    end: number | null;
  };
}

export const createLogSummaryEpic = <State>() =>
  combineEpics(createSummaryEffectsEpic<State>(), loadSummaryEpic as EpicWithState<
    typeof loadSummaryEpic,
    State
  >);

export const createSummaryEffectsEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageSummaryDependencies<State>
> => (action$, state$, { selectLogFilterQueryAsJson, selectVisibleLogSummary }) => {
  const filterQuery$ = state$.pipe(map(selectLogFilterQueryAsJson));
  const summaryInterval$ = state$.pipe(
    map(selectVisibleLogSummary),
    map(({ start, end }) => (start && end ? getLoadParameters(start, end) : null)),
    filter(isNotNull)
  );

  const shouldLoadBetweenNewInterval$ = action$.pipe(
    filter(logPositionActions.reportVisibleSummary.match),
    filter(
      ({ payload: { bucketsOnPage, pagesBeforeStart, pagesAfterEnd } }) =>
        bucketsOnPage < MINIMUM_BUCKETS_PER_PAGE ||
        pagesBeforeStart < MINIMUM_BUFFER_PAGES ||
        pagesAfterEnd < MINIMUM_BUFFER_PAGES
    ),
    map(({ payload: { start, end } }) => getLoadParameters(start, end))
  );

  const shouldLoadWithNewFilter$ = action$.pipe(
    filter(logFilterActions.applyLogFilterQuery.match),
    withLatestFrom(filterQuery$, (filterQuery, filterQueryString) => filterQueryString)
  );

  return merge(
    shouldLoadBetweenNewInterval$.pipe(
      withLatestFrom(filterQuery$),
      exhaustMap(([{ start, end, bucketSize }, filterQuery]) => [
        loadSummary({
          start,
          end,
          sourceId: 'default',
          bucketSize,
          filterQuery,
        }),
      ])
    ),
    shouldLoadWithNewFilter$.pipe(
      withLatestFrom(summaryInterval$),
      exhaustMap(([filterQuery, { start, end, bucketSize }]) => [
        loadSummary({
          start,
          end,
          sourceId: 'default',
          bucketSize: (end - start) / LOAD_BUCKETS_PER_PAGE,
          filterQuery,
        }),
      ])
    )
  );
};

const getLoadParameters = (start: number, end: number) => ({
  start: start - (end - start),
  end: end + (end - start),
  bucketSize: (end - start) / LOAD_BUCKETS_PER_PAGE,
});

const isNotNull = <T>(value: T | null): value is T => value !== null;
