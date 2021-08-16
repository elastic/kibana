/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../../../plugin';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';
import { BaseSearchStrategyResponse } from '../../../../common/search_strategies/failure_correlations/types';

interface SearchStrategyOptions {
  environment?: string;
  kuery?: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

export function useFailedTransactionsCorrelationsSearchStrategy<
  T extends BaseSearchStrategyResponse
>(params: SearchStrategyOptions, strategy: string) {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const [error, setError] = useState<Error>();
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loaded, setLoaded] = useState<number>(0);
  const [rawResponse, setRawResponse] = useState<T>();
  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [total, setTotal] = useState<number>(100);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  function setResponse(response: IKibanaSearchResponse<T>) {
    setIsRunning(response.isRunning || false);
    setRawResponse(response.rawResponse);
    setLoaded(response.loaded!);
    setTotal(response.total!);
    setTimeTook(response.rawResponse.took);
  }

  const startFetch = () => {
    setError(undefined);
    setIsComplete(false);
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    const req = { params };

    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search<IKibanaSearchRequest, IKibanaSearchResponse<T>>(req, {
        strategy,
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (res: IKibanaSearchResponse<T>) => {
          setResponse(res);
          if (isCompleteResponse(res)) {
            searchSubscription$.current?.unsubscribe();
            setIsRunning(false);
            setIsComplete(true);
          } else if (isErrorResponse(res)) {
            searchSubscription$.current?.unsubscribe();
            setError((res as unknown) as Error);
            setIsRunning(false);
          }
        },
        error: (e: Error) => {
          setError(e);
          setIsRunning(false);
        },
      });
  };

  const cancelFetch = () => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setIsRunning(false);
  };

  return {
    response: rawResponse,
    ccsWarning: rawResponse?.ccsWarning ?? false,
    log: rawResponse?.log ?? [],
    error,
    isComplete,
    isRunning,
    progress: loaded / total,
    timeTook,
    startFetch,
    cancelFetch,
  };
}
