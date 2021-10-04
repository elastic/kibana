/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Subscription } from 'rxjs';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { FIELD_STATS_SEARCH_STRATEGY } from '../../../../common/search_strategy/constants';
import type {
  FieldStatRawResponse,
  FieldStatsRequest,
  FieldStatsResponse,
  FieldStatsSearchStrategyParams,
  FieldStatsSearchStrategyProgress,
  FieldStatsSearchStrategyReturnBase,
} from '../../../../common/search_strategy/types';
import { useDataVisualizerKibana } from '../../kibana_context';

const getInitialRawResponse = <TRawResponse extends FieldStatRawResponse>(): TRawResponse =>
  ({
    ccsWarning: false,
    took: 0,
  } as TRawResponse);

const getInitialProgress = (): FieldStatsSearchStrategyProgress => ({
  isRunning: false,
  loaded: 0,
  total: 100,
});

const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });

export function useFieldStatsSearchStrategy<
  TRawResponse extends FieldStatRawResponse,
  TParams extends FieldStatsSearchStrategyParams
>(searchStrategyParams: TParams | undefined): FieldStatsSearchStrategyReturnBase<TRawResponse> {
  const {
    services: { data },
  } = useDataVisualizerKibana();

  useEffect(() => {
    console.log('searchStrategyParams updated');
  }, [searchStrategyParams]);

  const [rawResponse, setRawResponse] = useReducer(
    getReducer<TRawResponse>(),
    getInitialRawResponse<TRawResponse>()
  );

  const [fetchState, setFetchState] = useReducer(
    getReducer<FieldStatsSearchStrategyProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    setFetchState({
      ...getInitialProgress(),
      error: undefined,
    });

    const request = {
      params: searchStrategyParams,
    };

    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search<FieldStatsRequest, FieldStatsResponse>(request, {
        strategy: FIELD_STATS_SEARCH_STRATEGY,
        abortSignal: abortCtrl.current.signal,
        sessionId: searchStrategyParams?.sessionId,
      })
      .subscribe({
        next: (response) => {
          // Setting results to latest even if the response is still partial

          setRawResponse(response.rawResponse);

          setFetchState({
            isRunning: response.isRunning || false,
            ...(response.loaded ? { loaded: response.loaded } : {}),
            ...(response.total ? { total: response.total } : {}),
          });

          if (isCompleteResponse(response)) {
            // If the whole request is completed
            searchSubscription$.current?.unsubscribe();
            setFetchState({
              isRunning: false,
            });
          } else if (isErrorResponse(response)) {
            searchSubscription$.current?.unsubscribe();
            setFetchState({
              error: response as unknown as Error,
              isRunning: false,
            });
          }
        },
        error: (error: Error) => {
          setFetchState({
            error,
            isRunning: false,
          });
        },
      });
  }, [data.search, searchStrategyParams]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setFetchState({
      isRunning: false,
    });
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
    return cancelFetch;
  }, [startFetch, cancelFetch]);

  return {
    progress: fetchState,
    response: rawResponse,
    startFetch,
    cancelFetch,
  };
}
