/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import type { Subscription } from 'rxjs';

import {
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';

import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { ApmPluginStartDeps } from '../../../plugin';

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

export const useCorrelations = (params: CorrelationsOptions) => {
  const { pluginsStart } = useApmPluginContext();
  const data = (pluginsStart.data as unknown) as ApmPluginStartDeps['data'];

  const [error, setError] = useState<Error>();
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loaded, setLoaded] = useState<number>(0);
  const [rawResponse, setRawResponse] = useState<Record<string, any>>({});
  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [total, setTotal] = useState<number>(100);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  function setResponse(response: IKibanaSearchResponse) {
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
      .search(req, {
        strategy: 'mlCorrelationsSearchStrategy',
        abortSignal: abortCtrl.current.signal,
      })
      .subscribe({
        next: (res) => {
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
        error: (e) => {
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
