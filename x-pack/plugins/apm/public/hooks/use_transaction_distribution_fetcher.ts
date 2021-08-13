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
import type {
  HistogramItem,
  SearchServiceParams,
  SearchServiceValue,
} from '../../common/search_strategies/correlations/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ApmPluginStartDeps } from '../plugin';

interface RawResponse {
  percentileThresholdValue?: number;
  took: number;
  values: SearchServiceValue[];
  overallHistogram: HistogramItem[];
  log: string[];
  ccsWarning: boolean;
}

export function useTransactionDistributionFetcher(
  params: Omit<SearchServiceParams, 'analyzeCorrelations'>
) {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const [error, setError] = useState<Error>();
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loaded, setLoaded] = useState<number>(0);

  const [transactionDistribution, setTansactionDistribution] = useState<
    RawResponse['overallHistogram']
  >();
  const [percentileThresholdValue, setPercentileThresholdValue] = useState<
    RawResponse['percentileThresholdValue']
  >();

  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [total, setTotal] = useState<number>(100);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  function setResponse(response: IKibanaSearchResponse<RawResponse>) {
    setIsRunning(response.isRunning || false);

    // only set percentileThresholdValue and overallHistogram once it's repopulated on a refresh,
    // otherwise the consuming chart would flicker with an empty state on reload.
    if (
      response.rawResponse?.percentileThresholdValue !== undefined &&
      response.rawResponse?.overallHistogram !== undefined
    ) {
      setTansactionDistribution(response.rawResponse?.overallHistogram);
      setPercentileThresholdValue(
        response.rawResponse?.percentileThresholdValue
      );
    }

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

    const searchServiceParams: SearchServiceParams = {
      ...params,
      analyzeCorrelations: false,
    };
    const req = { params: searchServiceParams };

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
    percentileThresholdValue,
    isComplete,
    isRunning,
    progress: loaded / total,
    timeTook,
    transactionDistribution,
    startFetch,
    cancelFetch,
  };
}
