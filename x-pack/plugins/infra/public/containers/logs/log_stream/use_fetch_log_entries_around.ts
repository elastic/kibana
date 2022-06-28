/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { last, map, startWith, switchMap } from 'rxjs/operators';
import { LogEntryCursor } from '../../../../common/log_entry';
import { LogViewColumnConfiguration } from '../../../../common/log_views';
import { LogEntriesSearchRequestQuery } from '../../../../common/search_strategies/log_entries/log_entries';
import { flattenDataSearchResponseDescriptor } from '../../../utils/data_search';
import { useObservable, useObservableState } from '../../../utils/use_observable';
import { useLogEntriesAfterRequest } from './use_fetch_log_entries_after';
import { useLogEntriesBeforeRequest } from './use_fetch_log_entries_before';

export const useFetchLogEntriesAround = ({
  columnOverrides,
  endTimestamp,
  highlightPhrase,
  query,
  sourceId,
  startTimestamp,
}: {
  columnOverrides?: LogViewColumnConfiguration[];
  endTimestamp: number;
  highlightPhrase?: string;
  query?: LogEntriesSearchRequestQuery;
  sourceId: string;
  startTimestamp: number;
}) => {
  const { fetchLogEntriesBefore } = useLogEntriesBeforeRequest({
    columnOverrides,
    endTimestamp,
    highlightPhrase,
    query,
    sourceId,
    startTimestamp,
  });

  const { fetchLogEntriesAfter } = useLogEntriesAfterRequest({
    columnOverrides,
    endTimestamp,
    highlightPhrase,
    query,
    sourceId,
    startTimestamp,
  });

  type LogEntriesBeforeRequest = NonNullable<ReturnType<typeof fetchLogEntriesBefore>>;
  type LogEntriesAfterRequest = NonNullable<ReturnType<typeof fetchLogEntriesAfter>>;

  const logEntriesAroundSearchRequests$ = useObservable(
    () => new ReplaySubject<[LogEntriesBeforeRequest, Observable<LogEntriesAfterRequest>]>(),
    []
  );

  const fetchLogEntriesAround = useCallback(
    (cursor: LogEntryCursor, size: number) => {
      const logEntriesBeforeSearchRequest = fetchLogEntriesBefore(cursor, {
        size: Math.floor(size / 2),
      });

      if (logEntriesBeforeSearchRequest == null) {
        return;
      }

      const logEntriesAfterSearchRequest$ = flattenDataSearchResponseDescriptor(
        logEntriesBeforeSearchRequest
      ).pipe(
        last(), // in the future we could start earlier if we receive partial results already
        map((lastBeforeSearchResponse) => {
          const cursorAfter = lastBeforeSearchResponse.response.data?.bottomCursor ?? {
            time: cursor.time - 1,
            tiebreaker: 0,
          };

          const logEntriesAfterSearchRequest = fetchLogEntriesAfter(cursorAfter, {
            size: Math.ceil(size / 2),
          });

          if (logEntriesAfterSearchRequest == null) {
            throw new Error('Failed to create request: no request args given');
          }

          return logEntriesAfterSearchRequest;
        })
      );

      logEntriesAroundSearchRequests$.next([
        logEntriesBeforeSearchRequest,
        logEntriesAfterSearchRequest$,
      ]);
    },
    [fetchLogEntriesAfter, fetchLogEntriesBefore, logEntriesAroundSearchRequests$]
  );

  const logEntriesAroundSearchResponses$ = useObservable(
    (inputs$) =>
      inputs$.pipe(
        switchMap(([currentSearchRequests$]) =>
          currentSearchRequests$.pipe(
            switchMap(([beforeRequest, afterRequest$]) => {
              const beforeResponse$ = flattenDataSearchResponseDescriptor(beforeRequest);
              const afterResponse$ = afterRequest$.pipe(
                switchMap(flattenDataSearchResponseDescriptor),
                startWith(undefined) // emit "before" response even if "after" hasn't started yet
              );
              return combineLatest([beforeResponse$, afterResponse$]);
            }),
            map(([beforeResponse, afterResponse]) => {
              const loadedBefore = beforeResponse.response.loaded;
              const loadedAfter = afterResponse?.response.loaded;
              const totalBefore = beforeResponse.response.total;
              const totalAfter = afterResponse?.response.total;

              return {
                before: beforeResponse,
                after: afterResponse,
                combined: {
                  isRunning:
                    (beforeResponse.response.isRunning || afterResponse?.response.isRunning) ??
                    false,
                  isPartial:
                    (beforeResponse.response.isPartial || afterResponse?.response.isPartial) ??
                    false,
                  loaded:
                    loadedBefore != null || loadedAfter != null
                      ? (loadedBefore ?? 0) + (loadedAfter ?? 0)
                      : undefined,
                  total:
                    totalBefore != null || totalAfter != null
                      ? (totalBefore ?? 0) + (totalAfter ?? 0)
                      : undefined,
                  entries: [
                    ...(beforeResponse.response.data?.entries ?? []),
                    ...(afterResponse?.response.data?.entries ?? []),
                  ],
                  errors: [
                    ...(beforeResponse.response.errors ?? []),
                    ...(afterResponse?.response.errors ?? []),
                  ],
                  hasMoreBefore: beforeResponse.response.data?.hasMoreBefore,
                  hasMoreAfter: afterResponse?.response.data?.hasMoreAfter,
                  topCursor: beforeResponse.response.data?.topCursor,
                  bottomCursor: afterResponse?.response.data?.bottomCursor,
                },
              };
            })
          )
        )
      ),
    [logEntriesAroundSearchRequests$]
  );

  const {
    latestValue: {
      before: latestBeforeResponse,
      after: latestAfterResponse,
      combined: latestCombinedResponse,
    },
  } = useObservableState(logEntriesAroundSearchResponses$, initialCombinedResponse);

  const cancelRequest = useCallback(() => {
    latestBeforeResponse?.abortController.abort();
    latestAfterResponse?.abortController.abort();
  }, [latestBeforeResponse, latestAfterResponse]);

  return {
    cancelRequest,
    fetchLogEntriesAround,
    isRequestRunning: latestCombinedResponse?.isRunning ?? false,
    isResponsePartial: latestCombinedResponse?.isPartial ?? false,
    loaded: latestCombinedResponse?.loaded,
    logEntriesAroundSearchResponses$,
    total: latestCombinedResponse?.total,
  };
};

const initialCombinedResponse = {
  before: undefined,
  after: undefined,
  combined: undefined,
} as const;
