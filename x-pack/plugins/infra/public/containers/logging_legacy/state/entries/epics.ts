/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { interval, merge } from 'rxjs';
import {
  debounceTime,
  exhaustMap,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';

import { getLogEntryKey, isBetween, LogEntry } from '../../../../../common/log_entry';
import {
  isExhaustedLoadingResult,
  isFailureLoadingResult,
  isIntervalLoadingPolicy,
  isRunningLoadingProgress,
  LoadingState,
} from '../../../../utils/loading_state';
import { targetActions } from '../target';
import {
  consolidateEntries,
  reportVisibleEntries,
  startLiveStreaming,
  stopLiveStreaming,
} from './actions';
import { extendEntriesEnd$, extendEntriesStart$ } from './api/extend_entries';
import { CommonFetchEntriesDependencies } from './api/fetch_entries';
import { replaceEntries$, replaceEntriesWithLatest$ } from './api/replace_entries';

const ASSUMED_ENTRIES_PER_PAGE = 100;
const DESIRED_BUFFER_PAGES = 2;
const DEFAULT_INTERVAL_ENTRIES = (2 * DESIRED_BUFFER_PAGES + 1) * ASSUMED_ENTRIES_PER_PAGE;
const MIN_CHUNK_SIZE = 25;
const VISIBLE_INTERVAL_SETTLE_TIMEOUT = 2000;

interface ManageStreamIntervalDependencies<State> extends CommonFetchEntriesDependencies<State> {
  selectFirstEntry: (state: State) => LogEntry | null;
  selectLastEntry: (state: State) => LogEntry | null;
  selectEntriesStartLoadingState: (state: State) => LoadingState<any>;
  selectEntriesEndLoadingState: (state: State) => LoadingState<any>;
}

export const createSummaryEpic = <State>(): Epic<
  Action,
  Action,
  State,
  ManageStreamIntervalDependencies<State>
> => (
  action$,
  state$,
  {
    postToApi$,
    selectFirstEntry,
    selectLastEntry,
    selectEntriesStartLoadingState,
    selectEntriesEndLoadingState,
    selectSourceCoreFields,
    selectSourceIndices,
  }
) => {
  const staleIntervalAfterJump$ = action$.pipe(
    filter(targetActions.jumpToTarget.match),
    map(({ payload: target }) => target)
  );

  const staleIntervalAfterScroll$ = action$.pipe(
    filter(reportVisibleEntries.match),
    debounceTime(VISIBLE_INTERVAL_SETTLE_TIMEOUT),
    map(({ payload: { middleKey } }) => middleKey),
    filter(middleKey => middleKey !== null)
  );

  const missingStartEntriesAfterScroll$ = action$.pipe(
    filter(reportVisibleEntries.match),
    map(({ payload: { pagesBeforeStart } }) =>
      Math.ceil(ASSUMED_ENTRIES_PER_PAGE * (DESIRED_BUFFER_PAGES - pagesBeforeStart))
    ),
    filter(missingEntries => missingEntries > 0)
  );

  const missingEndEntriesAfterScroll$ = action$.pipe(
    filter(reportVisibleEntries.match),
    map(({ payload: { pagesAfterEnd } }) =>
      Math.ceil(ASSUMED_ENTRIES_PER_PAGE * (DESIRED_BUFFER_PAGES - pagesAfterEnd))
    ),
    filter(missingEntries => missingEntries > 0)
  );

  const staleEndEntries$ = merge(
    action$.pipe(
      filter(startLiveStreaming.match),
      exhaustMap(() =>
        interval(3000).pipe(
          map(() => ({ isJump: false })),
          startWith({ isJump: true }),
          takeUntil(action$.pipe(filter(stopLiveStreaming.match)))
        )
      )
    ),
    action$.pipe(filter(() => false /* TODO: filter jumpToEnd */), map(() => ({ isJump: true })))
  ).pipe(
    map(({ isJump }) => ({
      isJump,
      outdatedEntries: ASSUMED_ENTRIES_PER_PAGE * DESIRED_BUFFER_PAGES,
    }))
  );

  return merge(
    merge(
      staleIntervalAfterJump$,
      staleIntervalAfterScroll$.pipe(
        filter(() => {
          const state = state$.value;
          const startLoadingState = selectEntriesStartLoadingState(state);
          const endLoadingState = selectEntriesEndLoadingState(state);

          return (
            !isRunningLoadingProgress(startLoadingState.current) &&
            !isRunningLoadingProgress(endLoadingState.current)
          );
        })
      )
    ).pipe(
      withLatestFrom(postToApi$),
      switchMap(([target, postToApi]) => {
        const state = state$.value;
        const firstLogEntry = selectFirstEntry(state);
        const lastLogEntry = selectLastEntry(state);

        const isLocalJump =
          target !== null &&
          firstLogEntry !== null &&
          lastLogEntry !== null &&
          isBetween(firstLogEntry.fields, lastLogEntry.fields, target);

        // the interval is displayed symmetrically before and after the target
        const desiredEntriesPerEndpoint = Math.ceil(DEFAULT_INTERVAL_ENTRIES / 2);

        if (isLocalJump) {
          return [
            consolidateEntries({
              after: desiredEntriesPerEndpoint,
              before: desiredEntriesPerEndpoint,
              target: target!,
            }),
          ];
        } else if (target !== null) {
          return replaceEntries$(
            postToApi,
            target,
            desiredEntriesPerEndpoint,
            selectSourceIndices(state),
            selectSourceCoreFields(state)
          );
        } else {
          return [];
        }
      })
    ),
    missingStartEntriesAfterScroll$.pipe(
      filter(() => {
        const state = state$.value;
        const startLoadingState = selectEntriesStartLoadingState(state);
        const endLoadingState = selectEntriesEndLoadingState(state);

        return (
          !isIntervalLoadingPolicy(endLoadingState.policy) &&
          !isRunningLoadingProgress(startLoadingState.current) &&
          !isExhaustedLoadingResult(startLoadingState.last) &&
          !isFailureLoadingResult(startLoadingState.last)
        );
      }),
      withLatestFrom(postToApi$),
      exhaustMap(([missingEntries, postToApi]) => {
        const state = state$.value;
        const firstLogEntry = selectFirstEntry(state);

        if (firstLogEntry === null) {
          return [];
        }

        const chunkSize = Math.max(MIN_CHUNK_SIZE, missingEntries);
        const target = getLogEntryKey(firstLogEntry);
        return extendEntriesStart$(
          postToApi,
          target,
          chunkSize,
          selectSourceIndices(state),
          selectSourceCoreFields(state)
        ).pipe(takeUntil(staleIntervalAfterJump$));
      })
    ),
    missingEndEntriesAfterScroll$.pipe(
      filter(() => {
        const loadingState = selectEntriesEndLoadingState(state$.value);

        return (
          !isRunningLoadingProgress(loadingState.current) &&
          !isIntervalLoadingPolicy(loadingState.policy) &&
          !isExhaustedLoadingResult(loadingState.last) &&
          !isFailureLoadingResult(loadingState.last)
        );
      }),
      withLatestFrom(postToApi$),
      exhaustMap(([missingEntries, postToApi]) => {
        const state = state$.value;
        const lastLogEntry = selectLastEntry(state);

        if (lastLogEntry !== null) {
          return extendEntriesEnd$(
            postToApi,
            getLogEntryKey(lastLogEntry),
            Math.max(MIN_CHUNK_SIZE, missingEntries),
            selectSourceIndices(state),
            selectSourceCoreFields(state)
          ).pipe(takeUntil(staleIntervalAfterJump$));
        } else {
          return [];
        }
      })
    ),
    staleEndEntries$.pipe(
      withLatestFrom(postToApi$),
      exhaustMap(([{ isJump, outdatedEntries }, postToApi]) => {
        const state = state$.value;

        return replaceEntriesWithLatest$(
          postToApi,
          outdatedEntries,
          selectSourceIndices(state),
          selectSourceCoreFields(state),
          isJump
        ).pipe(takeUntil(staleIntervalAfterJump$));
      })
    ),
    staleIntervalAfterJump$.pipe(map(() => stopLiveStreaming()))
  );
};
