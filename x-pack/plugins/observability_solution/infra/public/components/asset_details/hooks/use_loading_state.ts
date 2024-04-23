/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  first,
  tap,
  switchMap,
  distinctUntilChanged,
  filter,
  map,
  debounceTime,
  skipUntil,
  withLatestFrom,
  BehaviorSubject,
  iif,
  merge,
  Observable,
} from 'rxjs';
import createContainer from 'constate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchSessionState, waitUntilNextSessionCompletes$ } from '@kbn/data-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useDatePickerContext } from './use_date_picker';

export type RequestState = 'running' | 'done' | 'error';
const WAIT_MS = 1000;

export const useLoadingState = () => {
  const { autoRefreshTick$, autoRefreshConfig$ } = useDatePickerContext();
  const { services } = useKibanaContextForPlugin();
  const {
    data: { search },
  } = services;

  const isAutoRefreshRequestPending$ = useMemo(() => new BehaviorSubject<boolean>(false), []);
  const requestsCount$ = useMemo(() => new BehaviorSubject(0), []);
  const requestState$ = useMemo(() => new BehaviorSubject<RequestState | null>(null), []);
  const [searchSessionId, setSearchSessionId] = useState<string>();

  const updateSearchSessionId = useCallback(() => {
    setSearchSessionId(() => search.session.start());
  }, [search.session]);

  const waitUntilRequestsCompletes$ = useCallback(
    () =>
      requestsCount$.pipe(
        distinctUntilChanged(),
        // Skip values emitted by subject$ until the first state equals 0.
        skipUntil(requestsCount$.pipe(first((state) => state === 0))),
        // Wait for a specified period of idle time before emitting a value.
        debounceTime(WAIT_MS),
        // Emit the first value where state equals 0.
        first((state) => state === 0)
      ),
    [requestsCount$]
  );

  const isAutoRefreshEnabled$ = useCallback(
    () =>
      autoRefreshConfig$.pipe(
        first((config) => {
          return !!config && config.isPaused !== true;
        })
      ),
    [autoRefreshConfig$]
  );

  useEffect(() => {
    updateSearchSessionId();
  }, [updateSearchSessionId]);

  useEffect(() => {
    // Subscribe to updates in the request state
    const requestStateSubscription = requestState$
      .pipe(
        filter((status): status is RequestState => !!status),
        map((status) => (['error', 'done'].includes(status) ? -1 : 1)),
        tap((value) => {
          // Update the number of running requests
          // NOTE: We could use the http.getLoadingCount$ instead, to count the number of HTTP requests.
          // However, it would consider the whole page, and here we're limiting the scope to the http requests that happen in the Asset Details context.
          requestsCount$.next(requestsCount$.getValue() + value);
        }),
        // Concatenate with loadingCounter$ observable
        switchMap(() =>
          requestsCount$.pipe(
            distinctUntilChanged(),
            skipUntil(isAutoRefreshEnabled$()),
            debounceTime(WAIT_MS),
            // Small window for requests to be considered in the auto-refresh cycle
            tap((runningRequestsCount) => {
              if (runningRequestsCount > 0) {
                // isAutoRefreshRequestPending$.next is only set to false in the autoRefreshTick$ subscription
                // which will allow us to control when new requests can be made.
                isAutoRefreshRequestPending$.next(true);
              }
            })
          )
        )
      )
      .subscribe();

    // Subscribe to autoRefreshTick$ observable
    const autoRefreshTickSubscription = merge(
      autoRefreshTick$.pipe(
        skipUntil(isAutoRefreshEnabled$()),
        withLatestFrom(requestsCount$),
        switchMap(([, count]) =>
          // Any request called using `use_request_observable` will fall into this case
          // If there are still pending requests
          iif(
            () => count > 0,
            // Wait until requests complete before processing the next tick
            waitUntilRequestsCompletes$().pipe(tap(() => isAutoRefreshRequestPending$.next(false))),
            // Else immediately emit false if the counter is already 0
            new Observable(() => {
              isAutoRefreshRequestPending$.next(false);
            })
          )
        )
      ),

      autoRefreshTick$.pipe(
        skipUntil(isAutoRefreshEnabled$()),
        withLatestFrom(search.session.state$),
        switchMap(([, state]) =>
          // if the current state$ value is not Completed
          iif(
            () =>
              state !== SearchSessionState.Completed &&
              state !== SearchSessionState.BackgroundCompleted,
            // Wait until queries using data.search complete before processing the next tick
            // data.search in the context of the Asset Details is used by Lens.
            waitUntilNextSessionCompletes$(search.session).pipe(tap(() => updateSearchSessionId())),
            // Else mmediately emit true if session state is already completed
            new Observable(() => {
              updateSearchSessionId();
            })
          )
        )
      )
    ).subscribe();

    return () => {
      requestStateSubscription.unsubscribe();
      autoRefreshTickSubscription.unsubscribe();
    };
  }, [
    autoRefreshTick$,
    isAutoRefreshEnabled$,
    isAutoRefreshRequestPending$,
    requestState$,
    requestsCount$,
    search.session,
    updateSearchSessionId,
    waitUntilRequestsCompletes$,
  ]);

  return {
    updateSearchSessionId,
    searchSessionId,
    requestState$,
    isAutoRefreshRequestPending$,
  };
};

export const [LoadingStateProvider, useLoadingStateContext] = createContainer(useLoadingState);
