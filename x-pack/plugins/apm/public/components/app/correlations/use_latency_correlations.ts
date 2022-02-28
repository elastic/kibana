/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { chunk, debounce } from 'lodash';

import { IHttpFetchError, ResponseErrorBody } from 'src/core/public';

import {
  DEBOUNCE_INTERVAL,
  DEFAULT_PERCENTILE_THRESHOLD,
} from '../../../../common/correlations/constants';
import type { FieldValuePair } from '../../../../common/correlations/types';
import { getPrioritizedFieldValuePairs } from '../../../../common/correlations/utils';
import type {
  LatencyCorrelation,
  LatencyCorrelationsResponse,
} from '../../../../common/correlations/latency_correlations/types';

import { callApmApi } from '../../../services/rest/create_call_apm_api';

import {
  getInitialResponse,
  getLatencyCorrelationsSortedByCorrelation,
  getReducer,
  CorrelationsProgress,
} from './utils/analysis_hook_utils';
import { useFetchParams } from './use_fetch_params';

// Overall progress is a float from 0 to 1.
const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_FIELD_CANDIDATES = LOADED_OVERALL_HISTOGRAM + 0.05;
const LOADED_FIELD_VALUE_PAIRS = LOADED_FIELD_CANDIDATES + 0.3;
const LOADED_DONE = 1;
const PROGRESS_STEP_FIELD_VALUE_PAIRS = 0.3;
const PROGRESS_STEP_CORRELATIONS = 0.6;

export function useLatencyCorrelations() {
  const fetchParams = useFetchParams();

  // This use of useReducer (the dispatch function won't get reinstantiated
  // on every update) and debounce avoids flooding consuming components with updates.
  // `setResponse.flush()` can be used to enforce an update.
  const [response, setResponseUnDebounced] = useReducer(
    getReducer<LatencyCorrelationsResponse & CorrelationsProgress>(),
    getInitialResponse()
  );
  const setResponse = useMemo(
    () => debounce(setResponseUnDebounced, DEBOUNCE_INTERVAL),
    []
  );

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
      fieldStats: undefined,
    });
    setResponse.flush();

    try {
      // `responseUpdate` will be enriched with additional data with subsequent
      // calls to the overall histogram, field candidates, field value pairs, correlation results
      // and histogram data for statistically significant results.
      const responseUpdate: LatencyCorrelationsResponse = {
        ccsWarning: false,
      };

      // Initial call to fetch the overall distribution for the log-log plot.
      const { overallHistogram, percentileThresholdValue } = await callApmApi(
        'POST /internal/apm/latency/overall_distribution',
        {
          signal: abortCtrl.current.signal,
          params: {
            body: {
              ...fetchParams,
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            },
          },
        }
      );
      responseUpdate.overallHistogram = overallHistogram;
      responseUpdate.percentileThresholdValue = percentileThresholdValue;

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      setResponse({
        ...responseUpdate,
        loaded: LOADED_OVERALL_HISTOGRAM,
      });
      setResponse.flush();

      const { fieldCandidates } = await callApmApi(
        'GET /internal/apm/correlations/field_candidates',
        {
          signal: abortCtrl.current.signal,
          params: {
            query: fetchParams,
          },
        }
      );

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      setResponse({
        loaded: LOADED_FIELD_CANDIDATES,
      });
      setResponse.flush();

      const chunkSize = 10;
      let chunkLoadCounter = 0;

      const fieldValuePairs: FieldValuePair[] = [];
      const fieldCandidateChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidateChunk of fieldCandidateChunks) {
        const fieldValuePairChunkResponse = await callApmApi(
          'POST /internal/apm/correlations/field_value_pairs',
          {
            signal: abortCtrl.current.signal,
            params: {
              body: {
                ...fetchParams,
                fieldCandidates: fieldCandidateChunk,
              },
            },
          }
        );

        if (fieldValuePairChunkResponse.fieldValuePairs.length > 0) {
          fieldValuePairs.push(...fieldValuePairChunkResponse.fieldValuePairs);
        }

        if (abortCtrl.current.signal.aborted) {
          return;
        }

        chunkLoadCounter++;
        setResponse({
          loaded:
            LOADED_FIELD_CANDIDATES +
            (chunkLoadCounter / fieldCandidateChunks.length) *
              PROGRESS_STEP_FIELD_VALUE_PAIRS,
        });
      }

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      setResponse.flush();

      chunkLoadCounter = 0;

      const fieldsToSample = new Set<string>();
      const latencyCorrelations: LatencyCorrelation[] = [];
      const fieldValuePairChunks = chunk(
        getPrioritizedFieldValuePairs(fieldValuePairs),
        chunkSize
      );

      const fallbackResults: LatencyCorrelation[] = [];
      for (const fieldValuePairChunk of fieldValuePairChunks) {
        const significantCorrelations = await callApmApi(
          'POST /internal/apm/correlations/significant_correlations',
          {
            signal: abortCtrl.current.signal,
            params: {
              body: { ...fetchParams, fieldValuePairs: fieldValuePairChunk },
            },
          }
        );

        if (significantCorrelations.latencyCorrelations.length > 0) {
          significantCorrelations.latencyCorrelations.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          latencyCorrelations.push(
            ...significantCorrelations.latencyCorrelations
          );
          responseUpdate.latencyCorrelations =
            getLatencyCorrelationsSortedByCorrelation([...latencyCorrelations]);
        } else {
          // If there's no correlation results that matches the criteria
          // Consider the fallback results
          if (significantCorrelations.fallbackResult) {
            fallbackResults.push(significantCorrelations.fallbackResult);
          }
        }

        chunkLoadCounter++;
        setResponse({
          ...responseUpdate,
          loaded:
            LOADED_FIELD_VALUE_PAIRS +
            (chunkLoadCounter / fieldValuePairChunks.length) *
              PROGRESS_STEP_CORRELATIONS,
        });

        if (abortCtrl.current.signal.aborted) {
          return;
        }
      }

      if (latencyCorrelations.length === 0 && fallbackResults.length > 0) {
        // Rank the fallback results and show at least one value
        const sortedFallbackResults = fallbackResults
          .filter((r) => r.correlation > 0)
          .sort((a, b) => b.correlation - a.correlation);

        responseUpdate.latencyCorrelations = sortedFallbackResults
          .slice(0, 1)
          .map((r) => ({ ...r, isFallbackResult: true }));
        setResponse({
          ...responseUpdate,
          loaded:
            LOADED_FIELD_VALUE_PAIRS +
            (chunkLoadCounter / fieldValuePairChunks.length) *
              PROGRESS_STEP_CORRELATIONS,
        });
      }
      setResponse.flush();

      const { stats } = await callApmApi(
        'POST /internal/apm/correlations/field_stats',
        {
          signal: abortCtrl.current.signal,
          params: {
            body: {
              ...fetchParams,
              fieldsToSample: [...fieldsToSample],
            },
          },
        }
      );

      responseUpdate.fieldStats = stats;
      setResponse({
        ...responseUpdate,
        loaded: LOADED_DONE,
        isRunning: false,
      });
      setResponse.flush();
    } catch (e) {
      if (!abortCtrl.current.signal.aborted) {
        const err = e as Error | IHttpFetchError<ResponseErrorBody>;
        setResponse({
          error:
            'response' in err
              ? err.body?.message ?? err.response?.statusText
              : err.message,
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
