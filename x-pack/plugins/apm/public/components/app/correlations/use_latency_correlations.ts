/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer } from 'react';

import { IHttpFetchError } from 'src/core/public';

import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../common/search_strategies/constants';
import type { RawResponseBase } from '../../../../common/search_strategies/types';
import type { LatencyCorrelationsRawResponse } from '../../../../common/search_strategies/latency_correlations/types';

import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';

import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { callApmApi } from '../../../services/rest/createCallApmApi';

type Response = LatencyCorrelationsRawResponse & RawResponseBase;

interface SearchStrategyProgress {
  error?: Error | IHttpFetchError;
  isRunning: boolean;
  loaded: number;
  total: number;
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
    getReducer<SearchStrategyProgress>(),
    getInitialProgress()
  );

  const startFetch = useCallback(async () => {
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
      const data = await callApmApi({
        endpoint: 'GET /internal/apm/latency/overall_distribution',
        signal: null,
        params: {
          query: {
            ...query,
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD + '',
          },
        },
      });

      setRawResponse(data);
    } catch (e) {
      // const err = e as Error | IHttpFetchError;
      // const message = error.body?.message ?? error.response?.statusText;
      setFetchState({
        error: e as Error,
      });
      return;
    }

    setFetchState({
      loaded: 0.05,
    });

    try {
      const data = await callApmApi({
        endpoint: 'GET /internal/apm/correlations/field_candidates',
        signal: null,
        params: {
          query,
        },
      });
    } catch (e) {
      // const err = e as Error | IHttpFetchError;
      // const message = error.body?.message ?? error.response?.statusText;
      setFetchState({
        error: e as Error,
      });
      return;
    }

    setFetchState({
      loaded: 0.05,
    });

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
