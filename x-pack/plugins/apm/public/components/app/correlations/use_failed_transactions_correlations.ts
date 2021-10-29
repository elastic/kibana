/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { chunk, debounce } from 'lodash';

import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import {
  DEBOUNCE_INTERVAL,
  DEFAULT_PERCENTILE_THRESHOLD,
} from '../../../../common/correlations/constants';
import type {
  FailedTransactionsCorrelation,
  FailedTransactionsCorrelationsResponse,
} from '../../../../common/correlations/failed_transactions_correlations/types';

import { callApmApi } from '../../../services/rest/createCallApmApi';

import {
  getInitialResponse,
  getFailedTransactionsCorrelationsSortedByScore,
  getReducer,
  CorrelationsProgress,
} from './utils/analysis_hook_utils';
import { useFetchParams } from './use_fetch_params';

type Response = FailedTransactionsCorrelationsResponse;

// Overall progress is a float from 0 to 1.
const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_FIELD_CANDIDATES = LOADED_OVERALL_HISTOGRAM + 0.05;
const LOADED_DONE = 1;
const PROGRESS_STEP_P_VALUES = 0.8;

export function useFailedTransactionsCorrelations() {
  const fetchParams = useFetchParams();

  // This use of useReducer (the dispatch function won't get reinstantiated
  // on every update) and debounce avoids flooding consuming components with updates.
  const [response, setResponseUnDebounced] = useReducer(
    getReducer<Response & CorrelationsProgress>(),
    getInitialResponse()
  );
  const setResponse = useMemo(
    () => debounce(setResponseUnDebounced, DEBOUNCE_INTERVAL),
    []
  );

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
      failedTransactionsCorrelations: undefined,
      percentileThresholdValue: undefined,
      overallHistogram: undefined,
      errorHistogram: undefined,
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
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
          },
        },
      })) as Response;

      const { overallHistogram: errorHistogram } = (await callApmApi({
        endpoint: 'POST /internal/apm/latency/overall_distribution',
        signal: null,
        params: {
          body: {
            ...fetchParams,
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            termFilters: [
              { fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure },
            ],
          },
        },
      })) as Response;

      if (isCancelledRef.current) {
        return;
      }

      setResponse({
        ...responseUpdate,
        errorHistogram,
        loaded: LOADED_OVERALL_HISTOGRAM,
      });
      setResponse.flush();

      const { fieldCandidates: candidates } = await callApmApi({
        endpoint: 'GET /internal/apm/correlations/field_candidates',
        signal: null,
        params: {
          query: fetchParams,
        },
      });

      if (isCancelledRef.current) {
        return;
      }

      const fieldCandidates = candidates.filter((t) => !(t === EVENT_OUTCOME));

      setResponse({
        loaded: LOADED_FIELD_CANDIDATES,
      });

      const failedTransactionsCorrelations: FailedTransactionsCorrelation[] =
        [];
      const fieldsToSample = new Set<string>();
      const chunkSize = 10;
      let chunkLoadCounter = 0;

      const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidatesChunk of fieldCandidatesChunks) {
        const pValues = await callApmApi({
          endpoint: 'POST /internal/apm/correlations/p_values',
          signal: null,
          params: {
            body: { ...fetchParams, fieldCandidates: fieldCandidatesChunk },
          },
        });

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
        }

        setResponse({
          ...responseUpdate,
          loaded:
            LOADED_FIELD_CANDIDATES +
            (chunkLoadCounter / fieldCandidatesChunks.length) *
              PROGRESS_STEP_P_VALUES,
        });

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
      setResponse({ ...responseUpdate, loaded: LOADED_DONE, isRunning: false });
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
