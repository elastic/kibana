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

import type { SearchServiceParams } from '../../common/search_strategies/types';
import type { RawResponseBase } from '../../common/search_strategies/types';
import { ApmSearchStrategies } from '../../common/search_strategies/constants';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../context/url_params_context/use_url_params';

import { ApmPluginStartDeps } from '../plugin';

import { useApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

interface SearchStrategyFetcherState {
  error?: Error;
  isComplete: boolean;
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

const getInitialFetchState = (): SearchStrategyFetcherState => ({
  isComplete: false,
  isRunning: false,
  loaded: 0,
  total: 100,
});

const getReducer = <T>() => (prev: T, update: Partial<T>): T => ({
  ...prev,
  ...update,
});

export function useSearchStrategy<
  TRawResponse extends RawResponseBase,
  TOptions extends {} = {}
>(searchStrategyName: ApmSearchStrategies, options: TOptions = {} as TOptions) {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const { serviceName, transactionType } = useApmServiceContext();
  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/services/:serviceName/transactions/view');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { urlParams } = useUrlParams();
  const { transactionName } = urlParams;

  const [rawResponse, setRawResponse] = useReducer(
    getReducer<TRawResponse>(),
    getInitialRawResponse<TRawResponse>()
  );

  const [fetchState, setFetchState] = useReducer(
    getReducer<SearchStrategyFetcherState>(),
    getInitialFetchState()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();
  // options get passed in as a Generic and we don't want to support
  // an updated on options changes, they should be considered non-changing options
  // to initialize the search service.
  const optionsRef = useRef(options);

  const startFetch = useCallback(() => {
    setFetchState({
      error: undefined,
      isComplete: false,
    });
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    const req = {
      params: {
        environment,
        serviceName,
        transactionName,
        transactionType,
        kuery,
        start,
        end,
        ...optionsRef.current,
      },
    };

    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search<
        IKibanaSearchRequest<SearchServiceParams & TOptions>,
        IKibanaSearchResponse<TRawResponse>
      >(req, {
        strategy: searchStrategyName,
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (res: IKibanaSearchResponse<TRawResponse>) => {
          setRawResponse(res.rawResponse);
          setFetchState({
            isRunning: res.isRunning || false,
            loaded: res.loaded!,
            total: res.total!,
          });

          if (isCompleteResponse(res)) {
            searchSubscription$.current?.unsubscribe();
            setFetchState({
              isRunning: false,
              isComplete: true,
            });
          } else if (isErrorResponse(res)) {
            searchSubscription$.current?.unsubscribe();
            setFetchState({
              error: (res as unknown) as Error,
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
    state: fetchState,
    data: rawResponse,
    startFetch,
    cancelFetch,
  };
}
