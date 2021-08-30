/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../src/plugins/data/public';
import type { SearchServiceParams } from '../../common/search_strategies/types';
import type { LatencyCorrelationsAsyncSearchServiceRawResponse } from '../../common/search_strategies/latency_correlations/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { APM_SEARCH_STRATEGIES } from '../../common/search_strategies/constants';
import { ApmPluginStartDeps } from '../plugin';

interface TransactionDistributionFetcherState {
  error?: Error;
  isComplete: boolean;
  isRunning: boolean;
  loaded: number;
  ccsWarning: LatencyCorrelationsAsyncSearchServiceRawResponse['ccsWarning'];
  log: LatencyCorrelationsAsyncSearchServiceRawResponse['log'];
  transactionDistribution?: LatencyCorrelationsAsyncSearchServiceRawResponse['overallHistogram'];
  percentileThresholdValue?: LatencyCorrelationsAsyncSearchServiceRawResponse['percentileThresholdValue'];
  timeTook?: number;
  total: number;
}

export function useTransactionDistributionFetcher() {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const [
    fetchState,
    setFetchState,
  ] = useState<TransactionDistributionFetcherState>({
    isComplete: false,
    isRunning: false,
    loaded: 0,
    ccsWarning: false,
    log: [],
    total: 100,
  });

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  function setResponse(
    response: IKibanaSearchResponse<LatencyCorrelationsAsyncSearchServiceRawResponse>
  ) {
    setFetchState((prevState) => ({
      ...prevState,
      isRunning: response.isRunning || false,
      ccsWarning: response.rawResponse?.ccsWarning ?? false,
      histograms: response.rawResponse?.values ?? [],
      log: response.rawResponse?.log ?? [],
      loaded: response.loaded!,
      total: response.total!,
      timeTook: response.rawResponse.took,
      // only set percentileThresholdValue and overallHistogram once it's repopulated on a refresh,
      // otherwise the consuming chart would flicker with an empty state on reload.
      ...(response.rawResponse?.percentileThresholdValue !== undefined &&
      response.rawResponse?.overallHistogram !== undefined
        ? {
            transactionDistribution: response.rawResponse?.overallHistogram,
            percentileThresholdValue:
              response.rawResponse?.percentileThresholdValue,
          }
        : {}),
      // if loading is done but didn't return any data for the overall histogram,
      // set it to an empty array so the consuming chart component knows loading is done.
      ...(!response.isRunning &&
      response.rawResponse?.overallHistogram === undefined
        ? { transactionDistribution: [] }
        : {}),
    }));
  }

  const startFetch = useCallback(
    (params: Omit<SearchServiceParams, 'analyzeCorrelations'>) => {
      setFetchState((prevState) => ({
        ...prevState,
        error: undefined,
        isComplete: false,
      }));
      searchSubscription$.current?.unsubscribe();
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();

      const searchServiceParams: SearchServiceParams = {
        ...params,
        analyzeCorrelations: false,
      };
      const req = { params: searchServiceParams };

      // Submit the search request using the `data.search` service.
      searchSubscription$.current = data.search
        .search<
          IKibanaSearchRequest,
          IKibanaSearchResponse<LatencyCorrelationsAsyncSearchServiceRawResponse>
        >(req, {
          strategy: APM_SEARCH_STRATEGIES.APM_LATENCY_CORRELATIONS,
          abortSignal: abortCtrl.current.signal,
        })
        .subscribe({
          next: (
            res: IKibanaSearchResponse<LatencyCorrelationsAsyncSearchServiceRawResponse>
          ) => {
            setResponse(res);
            if (isCompleteResponse(res)) {
              searchSubscription$.current?.unsubscribe();
              setFetchState((prevState) => ({
                ...prevState,
                isRunnning: false,
                isComplete: true,
              }));
            } else if (isErrorResponse(res)) {
              searchSubscription$.current?.unsubscribe();
              setFetchState((prevState) => ({
                ...prevState,
                error: (res as unknown) as Error,
                isRunning: false,
              }));
            }
          },
          error: (error: Error) => {
            setFetchState((prevState) => ({
              ...prevState,
              error,
              isRunning: false,
            }));
          },
        });
    },
    [data.search, setFetchState]
  );

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setFetchState((prevState) => ({
      ...prevState,
      isRunning: false,
    }));
  }, [setFetchState]);

  return {
    ...fetchState,
    progress: fetchState.loaded / fetchState.total,
    startFetch,
    cancelFetch,
  };
}
