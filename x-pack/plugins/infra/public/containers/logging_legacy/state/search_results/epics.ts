/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { concat, merge } from 'rxjs';
import { concatMap, filter, takeUntil, withLatestFrom } from 'rxjs/operators';

import { getLogEntryKey, LogEntry } from '../../../../../common/log_entry';
import { entriesActions } from '../entries';
import { searchActions } from '../search';
import { CommonFetchSearchResultsDependencies } from './api/fetch_search_results';
import {
  replaceWithContainedSearchResults$,
  replaceWithContainedSearchResultsAfter$,
  replaceWithContainedSearchResultsBefore$,
  replaceWithNewerSearchResultsAfter$,
  replaceWithOlderSearchResultsBefore$,
} from './api/replace_search_results';

interface ManageSearchResultsDependencies<State>
  extends CommonFetchSearchResultsDependencies<State> {
  selectQuery: (state: State) => string | null;
  selectFirstEntry: (state: State) => LogEntry | null;
  selectLastEntry: (state: State) => LogEntry | null;
}

export const createSearchResultsEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageSearchResultsDependencies<State>
> => (
  action$,
  state$,
  {
    postToApi$,
    selectQuery,
    selectFirstEntry,
    selectLastEntry,
    selectSourceCoreFields,
    selectSourceIndices,
  }
) => {
  const newQuery$ = action$.pipe(
    filter(
      action =>
        searchActions.search.match(action) ||
        entriesActions.replaceEntries.done.match(action)
    ),
    concatMap(() => {
      const state = state$.value;
      const query = selectQuery(state);
      const firstEntry = selectFirstEntry(state);
      const lastEntry = selectLastEntry(state);

      if (query && firstEntry && lastEntry) {
        return [
          {
            end: getLogEntryKey(lastEntry),
            query,
            start: getLogEntryKey(firstEntry),
          },
        ];
      } else {
        return [];
      }
    })
  );

  const newQueryBefore$ = action$.pipe(
    filter(entriesActions.extendEntriesStart.done.match),
    concatMap(({ payload: { params: { target }, result: { logEntries } } }) => {
      const query = selectQuery(state$.value);

      if (query && logEntries.length > 0) {
        return [
          {
            end: target,
            query,
            start: getLogEntryKey(logEntries[0]),
          },
        ];
      } else {
        return [];
      }
    })
  );

  const newQueryAfter$ = action$.pipe(
    filter(entriesActions.extendEntriesEnd.done.match),
    concatMap(({ payload: { params: { target }, result: { logEntries } } }) => {
      const query = selectQuery(state$.value);

      if (query && logEntries.length > 0) {
        return [
          {
            end: getLogEntryKey(logEntries[logEntries.length - 1]),
            query,
            start: target,
          },
        ];
      } else {
        return [];
      }
    })
  );

  const cancelSearch$ = merge(
    action$.pipe(filter(searchActions.clearSearch.match)),
    newQuery$
  );

  return merge(
    newQuery$.pipe(
      withLatestFrom(postToApi$),
      concatMap(([{ query, start, end }, postToApi]) => {
        const state = state$.value;
        const indices = selectSourceIndices(state);
        const fields = selectSourceCoreFields(state);

        return concat(
          replaceWithContainedSearchResults$(
            postToApi,
            indices,
            fields,
            start,
            end,
            query
          ),
          merge(
            replaceWithOlderSearchResultsBefore$(
              postToApi,
              indices,
              fields,
              start,
              1,
              query
            ),
            replaceWithNewerSearchResultsAfter$(
              postToApi,
              indices,
              fields,
              end,
              1,
              query
            )
          )
        ).pipe(takeUntil(cancelSearch$));
      })
    ),
    newQueryBefore$.pipe(
      withLatestFrom(postToApi$),
      concatMap(([{ query, start, end }, postToApi]) => {
        const state = state$.value;
        const indices = selectSourceIndices(state);
        const fields = selectSourceCoreFields(state);

        return concat(
          replaceWithContainedSearchResultsBefore$(
            postToApi,
            indices,
            fields,
            start,
            end,
            query
          ),
          replaceWithOlderSearchResultsBefore$(
            postToApi,
            indices,
            fields,
            start,
            1,
            query
          )
        ).pipe(takeUntil(cancelSearch$));
      })
    ),
    newQueryAfter$.pipe(
      withLatestFrom(postToApi$),
      concatMap(([{ query, start, end }, postToApi]) => {
        const state = state$.value;
        const indices = selectSourceIndices(state);
        const fields = selectSourceCoreFields(state);

        return concat(
          replaceWithContainedSearchResultsAfter$(
            postToApi,
            indices,
            fields,
            start,
            end,
            query
          ),
          replaceWithNewerSearchResultsAfter$(
            postToApi,
            indices,
            fields,
            end,
            1,
            query
          )
        ).pipe(takeUntil(cancelSearch$));
      })
    )
  );
};
