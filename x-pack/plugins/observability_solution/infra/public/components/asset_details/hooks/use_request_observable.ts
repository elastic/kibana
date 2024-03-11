/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { map, mergeMap, filter } from 'rxjs/operators';
import { catchError, of, from, BehaviorSubject, withLatestFrom } from 'rxjs';
import { useLoadingStateContext } from './use_loading_state';
import { useDatePickerContext } from './use_date_picker';

export const useRequestObservable = <T>() => {
  const { requestState$, isAutoRefreshRequestPending$ } = useLoadingStateContext();
  const { autoRefreshConfig$ } = useDatePickerContext();
  const request$ = useMemo(
    () => new BehaviorSubject<(() => Promise<T>) | undefined>(undefined),
    []
  );

  useEffect(() => {
    // Subscribe to updates in the request$
    const subscription = request$
      .pipe(
        // Combine latest values from request$, autoRefreshConfig$, and pendingRequests$
        withLatestFrom(isAutoRefreshRequestPending$, autoRefreshConfig$),
        // Filter out requests if there are pending requests or autoRefresh is paused
        // Prevents aborting running requests when autoRefresh is on
        filter(([, isAutoRefreshRequestPending, autoRefreshConfig]) => {
          return !isAutoRefreshRequestPending || autoRefreshConfig?.isPaused === true;
        }),
        mergeMap(([requestFn]) => {
          // If request function is not defined, return an observable that emits null
          if (!requestFn) {
            return of(null);
          }

          requestState$.next('running');
          return from(requestFn()).pipe(
            map((response) => {
              requestState$.next('done');
              return response;
            }),
            catchError((error) => {
              requestState$.next('error');
              throw error;
            })
          );
        })
      )
      .subscribe();

    return () => {
      requestState$.next('done');
      subscription.unsubscribe();
    };
  }, [autoRefreshConfig$, isAutoRefreshRequestPending$, request$, requestState$]);

  return { request$ };
};
