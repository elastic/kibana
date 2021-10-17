/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { chunk } from 'lodash';

import { IHttpFetchError } from 'src/core/public';

import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../common/correlations/constants';
import type { RawResponseBase } from '../../../../common/correlations/types';
import type {
  FailedTransactionsCorrelation,
  FailedTransactionsCorrelationsRawResponse,
} from '../../../../common/correlations/failed_transactions_correlations/types';

import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';

import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { callApmApi } from '../../../services/rest/createCallApmApi';

type Response = FailedTransactionsCorrelationsRawResponse & RawResponseBase;

interface SearchStrategyProgress {
  error?: Error | IHttpFetchError;
  isRunning: boolean;
  loaded: number;
  total: number;
}

function getFailedTransactionsCorrelationsSortedByScore(
  failedTransactionsCorrelations: FailedTransactionsCorrelation[]
) {
  return failedTransactionsCorrelations.sort((a, b) => b.score - a.score);
}

const getInitialRawResponse = (): Response =>
  ({
    ccsWarning: false,
    took: 0,
  } as Response);

const getInitialProgress = (): SearchStrategyProgress => ({
  isRunning: false,
  loaded: 0,
  total: 100,
});

const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });

export function useFailedTransactionsCorrelations() {
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
    getReducer<SearchStrategyProgress>(),
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
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
          },
        },
      })) as Response;

      const { overallHistogram: errorHistogram } = (await callApmApi({
        endpoint: 'POST /internal/apm/latency/overall_distribution',
        signal: null,
        params: {
          body: {
            ...query,
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

      setRawResponse({
        ...rawResponseUpdate,
        errorHistogram,
      });
      setFetchState({
        loaded: 5,
      });

      const { fieldCandidates: candidates } = await callApmApi({
        endpoint: 'GET /internal/apm/correlations/field_candidates',
        signal: null,
        params: {
          query,
        },
      });

      if (isCancelledRef.current) {
        return;
      }

      const fieldCandidates = candidates.filter((t) => !(t === EVENT_OUTCOME));

      setFetchState({
        loaded: 10,
      });

      const failedTransactionsCorrelations: FailedTransactionsCorrelation[] =
        [];
      const fieldsToSample = new Set<string>();
      const chunkSize = 10;
      let loadCounter = 0;

      const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

      for (const fieldCandidatesChunk of fieldCandidatesChunks) {
        const pValues = await callApmApi({
          endpoint: 'POST /internal/apm/correlations/p_values',
          signal: null,
          params: {
            body: { ...query, fieldCandidates: fieldCandidatesChunk },
          },
        });

        if (pValues.failedTransactionsCorrelations.length > 0) {
          pValues.failedTransactionsCorrelations.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          failedTransactionsCorrelations.push(
            ...pValues.failedTransactionsCorrelations
          );
          rawResponseUpdate.failedTransactionsCorrelations =
            getFailedTransactionsCorrelationsSortedByScore(
              failedTransactionsCorrelations
            );
          setRawResponse(rawResponseUpdate);
        }

        if (isCancelledRef.current) {
          return;
        }

        loadCounter += chunkSize;
        setFetchState({
          loaded: 20 + Math.round((loadCounter / fieldCandidates.length) * 80),
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
