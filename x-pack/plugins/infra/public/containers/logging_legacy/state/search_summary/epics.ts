/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { concatMap, filter, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators';

import { LogSummaryBucket } from '../../../../../common/log_summary';
import { TimeScale } from '../../../../../common/time';
import { searchActions } from '../search';
import { summaryActions } from '../summary';
import { CommonFetchSearchSummaryDependencies } from './api/fetch_search_summary';
import { replaceSearchSummary$ } from './api/replace_search_summary';

interface ManageSearchSummaryDependencies<State>
  extends CommonFetchSearchSummaryDependencies<State> {
  selectQuery: (state: State) => string | null;
  selectFirstSummaryBucket: (state: State) => LogSummaryBucket | null;
  selectLastSummaryBucket: (state: State) => LogSummaryBucket | null;
  selectSummaryBucketSize: (state: State) => TimeScale;
}

export const createSearchSummaryEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageSearchSummaryDependencies<State>
> => (
  action$,
  state$,
  {
    postToApi$,
    selectQuery,
    selectFirstSummaryBucket,
    selectLastSummaryBucket,
    selectSummaryBucketSize,
    selectSourceCoreFields,
    selectSourceIndices,
  }
) => {
  const newQuery$ = action$.pipe(
    filter(
      action =>
        searchActions.search.match(action) ||
        summaryActions.replaceSummary.done.match(action) ||
        summaryActions.extendSummaryStart.done.match(action) ||
        summaryActions.extendSummaryEnd.done.match(action)
    ),
    concatMap(() => {
      const state = state$.value;
      const query = selectQuery(state);
      const firstBucket = selectFirstSummaryBucket(state);
      const lastBucket = selectLastSummaryBucket(state);
      const bucketSize = selectSummaryBucketSize(state);

      if (query && firstBucket && lastBucket) {
        return [
          {
            bucketSize: {
              unit: bucketSize.unit,
              value: bucketSize.value * 2,
            },
            end: lastBucket.end,
            query,
            start: firstBucket.start,
          },
        ];
      } else {
        return [];
      }
    })
  );

  return newQuery$.pipe(
    withLatestFrom(postToApi$),
    switchMap(([{ query, start, end, bucketSize }, postToApi]) => {
      const state = state$.value;

      return replaceSearchSummary$(
        postToApi,
        selectSourceIndices(state),
        selectSourceCoreFields(state),
        start,
        end,
        bucketSize,
        query
      ).pipe(takeUntil(action$.pipe(filter(searchActions.clearSearch.match))));
    })
  );
};
