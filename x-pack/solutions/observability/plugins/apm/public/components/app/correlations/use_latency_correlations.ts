/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { debounce } from 'lodash';

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

import {
  DEBOUNCE_INTERVAL,
  DEFAULT_PERCENTILE_THRESHOLD,
} from '../../../../common/correlations/constants';
import { CorrelationType, type CorrelationsResponse } from '../../../../common/correlations/types';
import type { LatencyCorrelationsResponse } from '../../../../common/correlations/latency_correlations/types';

import { callApmApi } from '../../../services/rest/create_call_apm_api';

import type { CorrelationsProgress } from './utils/analysis_hook_utils';
import {
  getInitialResponse,
  getLatencyCorrelationsSortedByCorrelation,
  getReducer,
} from './utils/analysis_hook_utils';
import { useFetchParams } from './use_fetch_params';

export function useLatencyCorrelations() {
  const fetchParams = useFetchParams();

  // This use of useReducer (the dispatch function won't get reinstantiated
  // on every update) and debounce avoids flooding consuming components with updates.
  // `setResponse.flush()` can be used to enforce an update.
  const [response, setResponseUnDebounced] = useReducer(
    getReducer<LatencyCorrelationsResponse & CorrelationsProgress>(),
    getInitialResponse()
  );
  const setResponse = useMemo(() => debounce(setResponseUnDebounced, DEBOUNCE_INTERVAL), []);

  const abortCtrl = useRef(new AbortController());

  const startFetch = useCallback(async () => {
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    setResponse({
      ...getInitialResponse(),
      isRunning: true,
      // explicitly set these to undefined to override a possible previous state.
      error: undefined,
      latencyCorrelations: undefined,
      percentileThresholdValue: undefined,
      overallHistogram: undefined,
      totalDocCount: undefined,
    });
    setResponse.flush();

    try {
      // Single unified API call that handles all steps internally
      const unifiedResponse = (await callApmApi('POST /internal/apm/correlations', {
        signal: abortCtrl.current.signal,
        params: {
          body: {
            correlationType: CorrelationType.TRANSACTION_DURATION,
            ...fetchParams,
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            includeHistogram: true,
          },
        },
      })) as CorrelationsResponse & { includeHistogram: boolean };

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      // Map unified response to LatencyCorrelationsResponse format
      const responseUpdate: LatencyCorrelationsResponse = {
        ccsWarning: unifiedResponse.ccsWarning,
        overallHistogram: unifiedResponse.overallHistogram,
        totalDocCount: unifiedResponse.totalDocCount,
        percentileThresholdValue: unifiedResponse.percentileThresholdValue,
        latencyCorrelations:
          unifiedResponse.correlations.length > 0
            ? getLatencyCorrelationsSortedByCorrelation(
                unifiedResponse.correlations.filter(
                  (c): c is typeof c & { correlation: number; ksTest: number } =>
                    c.correlation !== undefined && c.ksTest !== undefined
                ) as any
              )
            : unifiedResponse.fallbackResult
            ? [
                {
                  ...unifiedResponse.fallbackResult,
                  correlation: unifiedResponse.fallbackResult.correlation ?? 0,
                  ksTest: unifiedResponse.fallbackResult.ksTest ?? 0,
                  isFallbackResult: true,
                } as any,
              ]
            : undefined,
      };

      setResponse({
        ...responseUpdate,
        loaded: 1,
        isRunning: false,
      });
      setResponse.flush();
    } catch (e) {
      if (!abortCtrl.current.signal.aborted) {
        const err = e as Error | IHttpFetchError<ResponseErrorBody>;
        setResponse({
          error: 'response' in err ? err.body?.message ?? err.response?.statusText : err.message,
          isRunning: false,
        });
        setResponse.flush();
      }
    }
  }, [fetchParams, setResponse]);

  const cancelFetch = useCallback(() => {
    abortCtrl.current.abort();
    setResponse({
      isRunning: false,
    });
    setResponse.flush();
  }, [setResponse]);

  // auto-update
  useEffect(() => {
    startFetch();
    return () => {
      abortCtrl.current.abort();
    };
  }, [startFetch, cancelFetch]);

  const { error, loaded, isRunning, ...returnedResponse } = response;
  const progress = useMemo(
    () => ({
      error,
      loaded: Math.round(loaded * 100) / 100,
      isRunning,
    }),
    [error, loaded, isRunning]
  );

  return {
    progress,
    response: returnedResponse,
    startFetch,
    cancelFetch,
  };
}
