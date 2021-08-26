/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../src/plugins/data/public';
import type { SearchServiceParams } from '../../common/search_strategies/correlations/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../plugin';
import { FailedTransactionsCorrelationValue } from '../../common/search_strategies/failure_correlations/types';
import { FAILED_TRANSACTIONS_CORRELATION_SEARCH_STRATEGY } from '../../common/search_strategies/failure_correlations/constants';

interface RawResponse {
  took: number;
  values: FailedTransactionsCorrelationValue[];
  log: string[];
  ccsWarning: boolean;
}

interface FailedTransactionsCorrelationsFetcherState {
  error?: Error;
  isComplete: boolean;
  isRunning: boolean;
  loaded: number;
  ccsWarning: RawResponse['ccsWarning'];
  values: RawResponse['values'];
  log: RawResponse['log'];
  timeTook?: number;
  total: number;
}

export const useFailedTransactionsCorrelationsFetcher = () => {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const [
    fetchState,
    setFetchState,
  ] = useState<FailedTransactionsCorrelationsFetcherState>({
    isComplete: false,
    isRunning: false,
    loaded: 0,
    ccsWarning: false,
    values: [],
    log: [],
    total: 100,
  });

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  function setResponse(response: IKibanaSearchResponse<RawResponse>) {
    setFetchState((prevState) => ({
      ...prevState,
      isRunning: response.isRunning || false,
      ccsWarning: response.rawResponse?.ccsWarning ?? false,
      values: response.rawResponse?.values ?? [],
      log: response.rawResponse?.log ?? [],
      loaded: response.loaded!,
      total: response.total!,
      timeTook: response.rawResponse.took,
    }));
  }

  const startFetch = (params: SearchServiceParams) => {
    setFetchState((prevState) => ({
      ...prevState,
      error: undefined,
      isComplete: false,
    }));
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    const req = { params };

    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search<IKibanaSearchRequest, IKibanaSearchResponse<RawResponse>>(req, {
        strategy: FAILED_TRANSACTIONS_CORRELATION_SEARCH_STRATEGY,
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (res: IKibanaSearchResponse<RawResponse>) => {
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
              setIsRunning: false,
            }));
          }
        },
        error: (error: Error) => {
          setFetchState((prevState) => ({
            ...prevState,
            error,
            setIsRunning: false,
          }));
        },
      });
  };

  const cancelFetch = () => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setFetchState((prevState) => ({
      ...prevState,
      setIsRunning: false,
    }));
  };

  return {
    ...fetchState,
    progress: fetchState.loaded / fetchState.total,
    startFetch,
    cancelFetch,
  };
};
