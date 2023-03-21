/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { chunk, debounce } from 'lodash';

import type {
  IHttpFetchError,
  ResponseErrorBody,
} from '@kbn/core-http-browser';

import { EVENT_OUTCOME } from '../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../common/event_outcome';
import {
  DEBOUNCE_INTERVAL,
  DEFAULT_PERCENTILE_THRESHOLD,
} from '../../../../common/correlations/constants';
import type {
  FailedTransactionsCorrelation,
  FailedTransactionsCorrelationsResponse,
} from '../../../../common/correlations/failed_transactions_correlations/types';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';

import { callApmApi } from '../../../services/rest/create_call_apm_api';

import {
  getInitialResponse,
  getFailedTransactionsCorrelationsSortedByScore,
  getReducer,
  CorrelationsProgress,
} from './utils/analysis_hook_utils';
import { useFetchParams } from './use_fetch_params';

// Overall progress is a float from 0 to 1.
const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_ERROR_HISTOGRAM = LOADED_OVERALL_HISTOGRAM + 0.05;
const LOADED_FIELD_CANDIDATES = LOADED_ERROR_HISTOGRAM + 0.05;
const LOADED_DONE = 1;
const PROGRESS_STEP_P_VALUES = 0.9 - LOADED_FIELD_CANDIDATES;

export function useFailedTransactionsCorrelations() {
  const fetchParams = useFetchParams();

  // This use of useReducer (the dispatch function won't get reinstantiated
  // on every update) and debounce avoids flooding consuming components with updates.
  // `setResponse.flush()` can be used to enforce an update.
  const [response, setResponseUnDebounced] = useReducer(
    getReducer<FailedTransactionsCorrelationsResponse & CorrelationsProgress>(),
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
      failedTransactionsCorrelations: undefined,
      percentileThresholdValue: undefined,
      overallHistogram: undefined,
      totalDocCount: undefined,
      errorHistogram: undefined,
    });
    setResponse.flush();

    try {
      // `responseUpdate` will be enriched with additional data with subsequent
      // calls to the overall histogram, field candidates, field value pairs, correlation results
      // and histogram data for statistically significant results.
      const responseUpdate: FailedTransactionsCorrelationsResponse = {
        ccsWarning: false,
        fallbackResult: undefined,
      };

      // Initial call to fetch the overall distribution for the log-log plot.
      const overallHistogramResponse = await callApmApi(
        'POST /internal/apm/latency/overall_distribution/transactions',
        {
          signal: abortCtrl.current.signal,
          params: {
            body: {
              ...fetchParams,
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
              chartType:
                LatencyDistributionChartType.failedTransactionsCorrelations,
            },
          },
        }
      );

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      const {
        overallHistogram,
        totalDocCount,
        percentileThresholdValue,
        durationMin,
        durationMax,
      } = overallHistogramResponse;

      responseUpdate.overallHistogram = overallHistogram;
      responseUpdate.totalDocCount = totalDocCount;
      responseUpdate.percentileThresholdValue = percentileThresholdValue;

      setResponse({
        ...responseUpdate,
        loaded: LOADED_OVERALL_HISTOGRAM,
      });
      setResponse.flush();

      const errorHistogramResponse = await callApmApi(
        'POST /internal/apm/latency/overall_distribution/transactions',
        {
          signal: abortCtrl.current.signal,
          params: {
            body: {
              ...fetchParams,
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
              termFilters: [
                {
                  fieldName: EVENT_OUTCOME,
                  fieldValue: EventOutcome.failure,
                },
              ],
              durationMin,
              durationMax,
              chartType:
                LatencyDistributionChartType.failedTransactionsCorrelations,
            },
          },
        }
      );

      if (abortCtrl.current.signal.aborted) {
        return;
      }

      const { overallHistogram: errorHistogram } = errorHistogramResponse;

      responseUpdate.errorHistogram = errorHistogram;

      setResponse({
        ...responseUpdate,
        loaded: LOADED_ERROR_HISTOGRAM,
      });
      setResponse.flush();

      const { fieldCandidates: candidates } = await callApmApi(
        'GET /internal/apm/correlations/field_candidates/transactions',
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

      const fieldCandidates = candidates.filter((t) => !(t === EVENT_OUTCOME));

      setResponse({
        loaded: LOADED_FIELD_CANDIDATES,
      });
      setResponse.flush();

      const failedTransactionsCorrelations: FailedTransactionsCorrelation[] =
        [];
      let fallbackResult: FailedTransactionsCorrelation | undefined;
      const fieldsToSample = new Set<string>();
      const chunkSize = 10;
      let chunkLoadCounter = 0;

      const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidatesChunk of fieldCandidatesChunks) {
        const pValues = await callApmApi(
          'POST /internal/apm/correlations/p_values/transactions',
          {
            signal: abortCtrl.current.signal,
            params: {
              body: {
                ...fetchParams,
                fieldCandidates: fieldCandidatesChunk,
                durationMin,
                durationMax,
              },
            },
          }
        );

        if (pValues.failedTransactionsCorrelations.length > 0) {
          pValues.failedTransactionsCorrelations.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          failedTransactionsCorrelations.push(
            ...pValues.failedTransactionsCorrelations
          );
          responseUpdate.failedTransactionsCorrelations =
            getFailedTransactionsCorrelationsSortedByScore([
              ...failedTransactionsCorrelations,
            ]);
        } else {
          // If there's no significant correlations found and there's a fallback result
          // Update the highest ranked/scored fall back result
          if (pValues.fallbackResult) {
            if (!fallbackResult) {
              fallbackResult = pValues.fallbackResult;
            } else {
              if (
                pValues.fallbackResult.normalizedScore >
                fallbackResult.normalizedScore
              ) {
                fallbackResult = pValues.fallbackResult;
              }
            }
          }
        }

        chunkLoadCounter++;
        setResponse({
          ...responseUpdate,
          loaded:
            LOADED_FIELD_CANDIDATES +
            (chunkLoadCounter / fieldCandidatesChunks.length) *
              PROGRESS_STEP_P_VALUES,
        });

        if (abortCtrl.current.signal.aborted) {
          return;
        }
      }

      setResponse({
        ...responseUpdate,
        fallbackResult,
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
