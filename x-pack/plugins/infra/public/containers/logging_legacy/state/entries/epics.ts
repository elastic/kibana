/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic, EpicWithState } from 'redux-observable';
import { /*interval,*/ merge } from 'rxjs';
import { exhaustMap, filter, map, withLatestFrom } from 'rxjs/operators';

import { pickTimeKey, TimeKey, timeKeyIsBetween } from '../../../../../common/time';
import { targetActions } from '../target';
import {
  loadEntries,
  loadMoreEntries,
  reportVisibleEntries,
  // startLiveStreaming,
  // stopLiveStreaming,
} from './actions';
import { loadMoreEntriesEpic } from './load_more_operation';
import { loadEntriesEpic } from './load_operation';

const LOAD_CHUNK_SIZE = 200;
const DESIRED_BUFFER_PAGES = 2;

interface ManageEntriesDependencies<State> {
  selectEntriesStart: (state: State) => TimeKey | null;
  selectEntriesEnd: (state: State) => TimeKey | null;
  selectHasMoreBeforeStart: (state: State) => boolean;
  selectHasMoreAfterEnd: (state: State) => boolean;
  selectIsLoadingEntries: (state: State) => boolean;
}

export const createEntriesEpic = <State>() =>
  combineEpics(
    createEntriesEffectsEpic<State>(),
    loadEntriesEpic as EpicWithState<typeof loadEntriesEpic, State>,
    loadMoreEntriesEpic as EpicWithState<typeof loadEntriesEpic, State>
  );

export const createEntriesEffectsEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageEntriesDependencies<State>
> => (
  action$,
  state$,
  {
    selectEntriesStart,
    selectEntriesEnd,
    selectHasMoreBeforeStart,
    selectHasMoreAfterEnd,
    selectIsLoadingEntries,
  }
) => {
  const shouldLoadAround$ = action$.pipe(
    filter(targetActions.jumpToTarget.match),
    withLatestFrom(state$),
    filter(([{ payload }, state]) => {
      const entriesStart = selectEntriesStart(state);
      const entriesEnd = selectEntriesEnd(state);

      return entriesStart && entriesEnd
        ? !timeKeyIsBetween(entriesStart, entriesEnd, payload)
        : true;
    }),
    map(([{ payload }]) => pickTimeKey(payload))
  );

  const shouldLoadMoreBefore$ = action$.pipe(
    filter(reportVisibleEntries.match),
    filter(({ payload: { pagesBeforeStart } }) => pagesBeforeStart < DESIRED_BUFFER_PAGES),
    withLatestFrom(state$),
    filter(([action, state]) => !selectIsLoadingEntries(state)),
    filter(([action, state]) => selectHasMoreBeforeStart(state)),
    map(([action, state]) => selectEntriesStart(state)),
    filter((entriesStart): entriesStart is TimeKey => entriesStart != null),
    map(pickTimeKey)
  );

  const shouldLoadMoreAfter$ = action$.pipe(
    filter(reportVisibleEntries.match),
    filter(({ payload: { pagesAfterEnd } }) => pagesAfterEnd < DESIRED_BUFFER_PAGES),
    withLatestFrom(state$),
    filter(([action, state]) => !selectIsLoadingEntries(state)),
    filter(([action, state]) => selectHasMoreAfterEnd(state)),
    map(([action, state]) => selectEntriesEnd(state)),
    filter((entriesEnd): entriesEnd is TimeKey => entriesEnd != null),
    map(pickTimeKey)
  );

  return merge(
    shouldLoadAround$.pipe(
      exhaustMap(target => [
        loadEntries({
          sourceId: 'default',
          timeKey: target,
          countBefore: LOAD_CHUNK_SIZE,
          countAfter: LOAD_CHUNK_SIZE,
        }),
      ])
    ),
    shouldLoadMoreAfter$.pipe(
      exhaustMap(target => [
        loadMoreEntries({
          sourceId: 'default',
          timeKey: target,
          countBefore: 0,
          countAfter: LOAD_CHUNK_SIZE,
        }),
      ])
    ),
    shouldLoadMoreBefore$.pipe(
      exhaustMap(target => [
        loadMoreEntries({
          sourceId: 'default',
          timeKey: target,
          countBefore: LOAD_CHUNK_SIZE,
          countAfter: 0,
        }),
      ])
    )
  );
};
