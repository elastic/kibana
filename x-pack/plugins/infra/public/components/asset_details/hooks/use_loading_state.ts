/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  first,
  tap,
  concatMap,
  switchMap,
  distinctUntilChanged,
  filter,
  map,
  debounceTime,
  skipUntil,
} from 'rxjs/operators';
import createContainer from 'constate';
import { BehaviorSubject, merge } from 'rxjs';
import { useCallback, useEffect, useRef } from 'react';
import { waitUntilNextSessionCompletes$ } from '@kbn/data-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useDatePickerContext } from './use_date_picker';

export type RequestState = 'running' | 'done';
const DEBOUNCE_TS = 1000;

export const useLoadingState = () => {
  const { autoRefreshTick$, autoRefreshConfig$ } = useDatePickerContext();
  const { services } = useKibanaContextForPlugin();
  const {
    data: { search },
  } = services;

  const isAutoRefreshRequestPending$ = useRef(new BehaviorSubject<boolean>(false));
  const requestsCount$ = useRef(new BehaviorSubject(0));
  const requestState$ = useRef(new BehaviorSubject<RequestState | null>(null));

  const updateSearchSessionId = useCallback(() => {
    search.session.start();
  }, [search.session]);

  const waitUntilRequestsCompletes$ = useCallback(
    () =>
      requestsCount$.current.pipe(
        distinctUntilChanged(),
        // Skip values emitted by subject$ until the first state equals 0.
        skipUntil(requestsCount$.current.pipe(first((state) => state === 0))),
        // Wait for a specified period of idle time before emitting a value.
        debounceTime(DEBOUNCE_TS),
        // Emit the first value where state equals 0.
        first((state) => state === 0)
      ),
    []
  );

  const isAutoRefreshEnabled$ = useCallback(
    () =>
      autoRefreshConfig$.pipe(first((autoRefreshConfig) => autoRefreshConfig?.isPaused !== true)),
    [autoRefreshConfig$]
  );

  useEffect(() => {
    updateSearchSessionId();
  }, [search.session, updateSearchSessionId]);

  useEffect(() => {
    // Subscribe to updates in the request state
    const requestStateSubscription = requestState$.current
      .pipe(
        filter((status) => !!status),
        map((status) => (status === 'done' ? -1 : 1)),
        tap((value) => {
          // Update the number of running requests
          // http.getLoadingCount$ will count all http requests on the page
          // here we're limiting the scope to the http requests that happen in the Asset Details context.
          requestsCount$.current.next(requestsCount$.current.getValue() + value);
        }),
        // Concatenate with loadingCounter$ observable
        concatMap(() =>
          requestsCount$.current.pipe(
            skipUntil(isAutoRefreshEnabled$()),
            distinctUntilChanged(),
            // Small window for requests to be considered in the auto-refresh cycle
            debounceTime(DEBOUNCE_TS),
            tap((runningRequestsCount) => {
              if (runningRequestsCount > 0) {
                // isAutoRefreshRequestPending$.current.next is only set to false in the autoRefreshTick$ subscription
                // which will allow us to control when a new request can
                isAutoRefreshRequestPending$.current.next(true);
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
        switchMap(() =>
          // Wait until requests complete before processing the next tick
          // Any request called using `use_request_observable` will fall into this case
          waitUntilRequestsCompletes$().pipe(
            tap(() => isAutoRefreshRequestPending$.current.next(false))
          )
        )
      ),
      autoRefreshTick$.pipe(
        skipUntil(isAutoRefreshEnabled$()),
        concatMap(() =>
          // Wait until queries using data.search complete before processing the next tick
          // data.search in the context of the Asset Details is used by Lens
          waitUntilNextSessionCompletes$(search.session, {
            waitForIdle: DEBOUNCE_TS,
          }).pipe(tap(() => updateSearchSessionId()))
        )
      )
    ).subscribe();

    return () => {
      requestStateSubscription.unsubscribe();
      autoRefreshTickSubscription.unsubscribe();
    };
  }, [
    autoRefreshConfig$,
    autoRefreshTick$,
    isAutoRefreshEnabled$,
    search.session,
    updateSearchSessionId,
    waitUntilRequestsCompletes$,
  ]);

  return {
    updateSearchSessionId,
    searchSessionId: search.session.getSessionId(),
    requestState$: requestState$.current,
    isAutoRefreshRequestPending$: isAutoRefreshRequestPending$.current,
  };
};

export const [LoadingStateProvider, useLoadingStateContext] = createContainer(useLoadingState);
