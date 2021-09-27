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
import {
  FieldStatRawResponse,
  FieldStatsRequest,
  FieldStatsResponse,
} from '../../../../common/search_strategy/types';
import { useDataVisualizerKibana } from '../../kibana_context';

interface SearchStrategyReturnBase<TRawResponse extends FieldStatRawResponse> {
  progress: SearchStrategyProgress;
  response: TRawResponse;
  startFetch: () => void;
  cancelFetch: () => void;
}

interface SearchStrategyProgress {
  error?: Error;
  isRunning: boolean;
  loaded: number;
  total: number;
}

const getInitialRawResponse = <TRawResponse extends FieldStatRawResponse>(): TRawResponse =>
  ({
    ccsWarning: false,
    took: 0,
  } as TRawResponse);

const getInitialProgress = (): SearchStrategyProgress => ({
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

interface SearchStrategyParams {
  sessionId?: string;
  // @todo update type
  query?: any;
}
export function useFieldStatsSearchStrategy<
  TRawResponse extends FieldStatRawResponse,
  TParams extends SearchStrategyParams
>(searchStrategyParams?: TParams): SearchStrategyReturnBase<TRawResponse> {
  console.log('searchStrategyParams', searchStrategyParams);
  const {
    services: { data },
  } = useDataVisualizerKibana();

  const [rawResponse, setRawResponse] = useReducer(
    getReducer<TRawResponse>(),
    getInitialRawResponse<TRawResponse>()
  );

  const [fetchState, setFetchState] = useReducer(
    getReducer<SearchStrategyProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();
  const searchStrategyParamsRef = useRef(searchStrategyParams);

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    setFetchState({
      ...getInitialProgress(),
      error: undefined,
    });

    const request = {
      params: {},
    };

    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search<FieldStatsRequest, FieldStatsResponse>(request, {
        strategy: FIELD_STATS_SEARCH_STRATEGY,
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (response: FieldStatsResponse) => {
          setRawResponse(response.rawResponse);
          setFetchState({
            isRunning: response.isRunning || false,
            ...(response.loaded ? { loaded: response.loaded } : {}),
            ...(response.total ? { total: response.total } : {}),
          });

          if (isCompleteResponse(response)) {
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
  }, [data.search]);

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
