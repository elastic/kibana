/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { chunk, debounce } from 'lodash';

import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../common/correlations/constants';
import type { FieldValuePair } from '../../../../common/correlations/types';
import { getPrioritizedFieldValuePairs } from '../../../../common/correlations/utils';
import type {
  LatencyCorrelation,
  LatencyCorrelationsResponse,
} from '../../../../common/correlations/latency_correlations/types';

import { callApmApi } from '../../../services/rest/createCallApmApi';

import {
  getInitialResponse,
  getLatencyCorrelationsSortedByCorrelation,
  getReducer,
  CorrelationsProgress,
} from './utils/analysis_hook_utils';
import { useFetchParams } from './use_fetch_params';

type Response = LatencyCorrelationsResponse;

export function useLatencyCorrelations() {
  const fetchParams = useFetchParams();

  const [response, setResponseUnDebounced] = useReducer(
    getReducer<Response & CorrelationsProgress>(),
    getInitialResponse()
  );
  const setResponse = useMemo(() => debounce(setResponseUnDebounced, 100), []);

  // We're using a ref here because otherwise the startFetch function might have
  // a stale value for checking if the task has been cancelled.
  const isCancelledRef = useRef(false);

  const startFetch = useCallback(async () => {
    isCancelledRef.current = false;

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
      const responseUpdate = (await callApmApi({
        endpoint: 'POST /internal/apm/latency/overall_distribution',
        signal: null,
        params: {
          body: {
            ...fetchParams,
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD + '',
          },
        },
      })) as Response;

      if (isCancelledRef.current) {
        return;
      }

      setResponse({
        ...responseUpdate,
        loaded: 0.05,
      });
      setResponse.flush();

      const { fieldCandidates } = await callApmApi({
        endpoint: 'GET /internal/apm/correlations/field_candidates',
        signal: null,
        params: {
          query: fetchParams,
        },
      });

      if (isCancelledRef.current) {
        return;
      }

      setResponse({
        loaded: 0.1,
      });

      const chunkSize = 10;
      let chunkLoadCounter = 0;

      const fieldValuePairs: FieldValuePair[] = [];
      const fieldCandidateChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidateChunk of fieldCandidateChunks) {
        const fieldValuePairChunkResponse = await callApmApi({
          endpoint: 'GET /internal/apm/correlations/field_value_pairs',
          signal: null,
          params: {
            query: {
              ...fetchParams,
              fieldCandidates: fieldCandidateChunk,
            },
          },
        });

        if (fieldValuePairChunkResponse.fieldValuePairs.length > 0) {
          fieldValuePairs.push(...fieldValuePairChunkResponse.fieldValuePairs);
        }

        if (isCancelledRef.current) {
          return;
        }

        setResponse({
          loaded:
            0.1 +
            Math.round((chunkLoadCounter / fieldCandidateChunks.length) * 30) /
              100,
        });
        chunkLoadCounter++;
      }

      if (isCancelledRef.current) {
        return;
      }

      chunkLoadCounter = 0;

      const fieldsToSample = new Set<string>();
      const latencyCorrelations: LatencyCorrelation[] = [];
      const fieldValuePairChunks = chunk(
        getPrioritizedFieldValuePairs(fieldValuePairs),
        chunkSize
      );

      for (const fieldValuePairChunk of fieldValuePairChunks) {
        const significantCorrelations = await callApmApi({
          endpoint: 'POST /internal/apm/correlations/significant_correlations',
          signal: null,
          params: {
            body: { ...fetchParams, fieldValuePairs: fieldValuePairChunk },
          },
        });

        if (significantCorrelations.latencyCorrelations.length > 0) {
          significantCorrelations.latencyCorrelations.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          latencyCorrelations.push(
            ...significantCorrelations.latencyCorrelations
          );
          responseUpdate.latencyCorrelations =
            getLatencyCorrelationsSortedByCorrelation([...latencyCorrelations]);
          setResponse({
            ...responseUpdate,
            loaded:
              0.4 +
              Math.round(
                (chunkLoadCounter / fieldValuePairChunks.length) * 60
              ) /
                100,
          });
        }

        if (isCancelledRef.current) {
          return;
        }

        chunkLoadCounter++;
      }

      const fieldStats = await callApmApi({
        endpoint: 'POST /internal/apm/correlations/field_stats',
        signal: null,
        params: {
          body: {
            ...fetchParams,
            fieldsToSample: [...fieldsToSample],
          },
        },
      });

      responseUpdate.fieldStats = fieldStats.stats;
      setResponse({ ...responseUpdate, loaded: 1, isRunning: false });
      setResponse.flush();
    } catch (e) {
      // TODO Improve error handling
      // const err = e as Error | IHttpFetchError;
      // const message = error.body?.message ?? error.response?.statusText;
      setResponse({
        error: e as Error,
        isRunning: false,
      });
      setResponse.flush();
    }
  }, [fetchParams, setResponse]);

  const cancelFetch = useCallback(() => {
    isCancelledRef.current = true;
    setResponse({
      isRunning: false,
    });
  }, [setResponse]);

  // auto-update
  useEffect(() => {
    startFetch();
    return cancelFetch;
  }, [startFetch, cancelFetch]);

  const { error, loaded, isRunning, ...returnedResponse } = response;
  const progress = useMemo(
    () => ({
      error,
      loaded,
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
