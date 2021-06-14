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
} from '../../../../../../../src/plugins/data/public';
import type { SearchServiceValue } from '../../../../common/search_strategies/correlations/types';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../../../plugin';

interface CorrelationsOptions {
  index: string;
  environment?: string;
  kuery?: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

interface RawResponse {
  percentileThresholdValue?: number;
  took: number;
  values: SearchServiceValue[];
}

export const useCorrelations = (params: CorrelationsOptions) => {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const [error, setError] = useState<Error>();
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loaded, setLoaded] = useState<number>(0);
  const [rawResponse, setRawResponse] = useState<RawResponse>();
  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [total, setTotal] = useState<number>(100);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  function setResponse(response: IKibanaSearchResponse<RawResponse>) {
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
      .search<IKibanaSearchRequest, IKibanaSearchResponse<RawResponse>>(req, {
        strategy: 'apmCorrelationsSearchStrategy',
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (res: IKibanaSearchResponse<RawResponse>) => {
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
    error,
    histograms: rawResponse?.values ?? [],
    percentileThresholdValue:
      rawResponse?.percentileThresholdValue ?? undefined,
    isComplete,
    isRunning,
    progress: loaded / total,
    timeTook,
    startFetch,
    cancelFetch,
  };
};
