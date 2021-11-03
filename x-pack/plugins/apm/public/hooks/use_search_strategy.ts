/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Subscription } from 'rxjs';

import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../src/plugins/data/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

import type { RawSearchStrategyClientParams } from '../../common/search_strategies/types';
import type { RawResponseBase } from '../../common/search_strategies/types';
import type {
  LatencyCorrelationsParams,
  LatencyCorrelationsRawResponse,
} from '../../common/search_strategies/latency_correlations/types';
import type {
  FailedTransactionsCorrelationsParams,
  FailedTransactionsCorrelationsRawResponse,
} from '../../common/search_strategies/failed_transactions_correlations/types';
import {
  ApmSearchStrategies,
  APM_SEARCH_STRATEGIES,
} from '../../common/search_strategies/constants';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../context/url_params_context/use_url_params';

import { ApmPluginStartDeps } from '../plugin';

import { useApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

interface SearchStrategyProgress {
  error?: Error;
  isRunning: boolean;
  loaded: number;
  total: number;
}

const getInitialRawResponse = <
  TRawResponse extends RawResponseBase
>(): TRawResponse =>
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

interface SearchStrategyReturnBase<TRawResponse extends RawResponseBase> {
  progress: SearchStrategyProgress;
  response: TRawResponse;
  startFetch: () => void;
  cancelFetch: () => void;
}

// Function overload for Latency Correlations
export function useSearchStrategy(
  searchStrategyName: typeof APM_SEARCH_STRATEGIES.APM_LATENCY_CORRELATIONS,
  searchStrategyParams: LatencyCorrelationsParams
): SearchStrategyReturnBase<LatencyCorrelationsRawResponse & RawResponseBase>;

// Function overload for Failed Transactions Correlations
export function useSearchStrategy(
  searchStrategyName: typeof APM_SEARCH_STRATEGIES.APM_FAILED_TRANSACTIONS_CORRELATIONS,
  searchStrategyParams: FailedTransactionsCorrelationsParams
): SearchStrategyReturnBase<
  FailedTransactionsCorrelationsRawResponse & RawResponseBase
>;

export function useSearchStrategy<
  TRawResponse extends RawResponseBase,
  TParams = unknown
>(
  searchStrategyName: ApmSearchStrategies,
  searchStrategyParams?: TParams
): SearchStrategyReturnBase<TRawResponse> {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const { serviceName, transactionType } = useApmServiceContext();
  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { urlParams } = useUrlParams();
  const { transactionName } = urlParams;

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
      params: {
        environment,
        serviceName,
        transactionName,
        transactionType,
        kuery,
        start,
        end,
        ...(searchStrategyParamsRef.current
          ? { ...searchStrategyParamsRef.current }
          : {}),
      },
    };

    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search<
        IKibanaSearchRequest<RawSearchStrategyClientParams & (TParams | {})>,
        IKibanaSearchResponse<TRawResponse>
      >(request, {
        strategy: searchStrategyName,
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (response: IKibanaSearchResponse<TRawResponse>) => {
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
  }, [
    searchStrategyName,
    data.search,
    environment,
    serviceName,
    transactionName,
    transactionType,
    kuery,
    start,
    end,
  ]);

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
