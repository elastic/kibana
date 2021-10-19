/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { chunk } from 'lodash';

import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../common/correlations/constants';
import type { FieldValuePair } from '../../../../common/correlations/types';
import { getPrioritizedFieldValuePairs } from '../../../../common/correlations/utils';
import type {
  LatencyCorrelation,
  LatencyCorrelationsRawResponse,
} from '../../../../common/correlations/latency_correlations/types';

import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';

import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { callApmApi } from '../../../services/rest/createCallApmApi';

import {
  getInitialProgress,
  getLatencyCorrelationsSortedByCorrelation,
  getInitialRawResponse,
  getReducer,
  CorrelationsProgress,
} from './utils/analysis_hook_utils';

type Response = LatencyCorrelationsRawResponse;

export function useLatencyCorrelations() {
  const { serviceName, transactionType } = useApmServiceContext();

  const { urlParams } = useUrlParams();
  const { transactionName } = urlParams;

  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const [rawResponse, setRawResponse] = useReducer(
    getReducer<Response>(),
    getInitialRawResponse()
  );

  const [fetchState, setFetchState] = useReducer(
    getReducer<CorrelationsProgress>(),
    getInitialProgress()
  );

  const isCancelledRef = useRef(false);

  const startFetch = useCallback(async () => {
    isCancelledRef.current = false;

    setFetchState({
      ...getInitialProgress(),
      isRunning: true,
      error: undefined,
    });

    const query = {
      serviceName,
      transactionName,
      transactionType,
      kuery,
      environment,
      start,
      end,
    };

    try {
      const rawResponseUpdate = (await callApmApi({
        endpoint: 'POST /internal/apm/latency/overall_distribution',
        signal: null,
        params: {
          body: {
            ...query,
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD + '',
          },
        },
      })) as Response;

      if (isCancelledRef.current) {
        return;
      }

      setRawResponse(rawResponseUpdate);
      setFetchState({
        loaded: 5,
      });

      const { fieldCandidates } = await callApmApi({
        endpoint: 'GET /internal/apm/correlations/field_candidates',
        signal: null,
        params: {
          query,
        },
      });

      if (isCancelledRef.current) {
        return;
      }

      setFetchState({
        loaded: 10,
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
              ...query,
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

        chunkLoadCounter += chunkSize;
        setFetchState({
          loaded:
            10 + Math.round((chunkLoadCounter / fieldValuePairs.length) * 10),
        });
      }

      if (isCancelledRef.current) {
        return;
      }

      setFetchState({
        loaded: 20,
      });

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
            body: { ...query, fieldValuePairs: fieldValuePairChunk },
          },
        });

        if (significantCorrelations.latencyCorrelations.length > 0) {
          significantCorrelations.latencyCorrelations.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          latencyCorrelations.push(
            ...significantCorrelations.latencyCorrelations
          );
          rawResponseUpdate.latencyCorrelations =
            getLatencyCorrelationsSortedByCorrelation(latencyCorrelations);
          setRawResponse(rawResponseUpdate);
        }

        if (isCancelledRef.current) {
          return;
        }

        chunkLoadCounter += chunkSize;
        setFetchState({
          loaded:
            20 + Math.round((chunkLoadCounter / fieldValuePairs.length) * 80),
        });
      }

      const fieldStats = await callApmApi({
        endpoint: 'POST /internal/apm/correlations/field_stats',
        signal: null,
        params: {
          body: {
            ...query,
            fieldsToSample: [...fieldsToSample],
          },
        },
      });

      rawResponseUpdate.fieldStats = fieldStats.stats;
      setRawResponse(rawResponseUpdate);

      setFetchState({
        loaded: 100,
      });
    } catch (e) {
      // const err = e as Error | IHttpFetchError;
      // const message = error.body?.message ?? error.response?.statusText;
      setFetchState({
        error: e as Error,
      });
    }

    setFetchState({
      isRunning: false,
    });
  }, [
    environment,
    serviceName,
    transactionName,
    transactionType,
    kuery,
    start,
    end,
  ]);

  const cancelFetch = useCallback(() => {
    isCancelledRef.current = true;
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
    progress: fetchState,
    response: rawResponse,
    startFetch,
    cancelFetch,
  };
}
