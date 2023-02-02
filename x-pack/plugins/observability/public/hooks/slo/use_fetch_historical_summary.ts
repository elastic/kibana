/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';
import { FetchHistoricalSummaryResponse } from '@kbn/slo-schema';

import { useDataFetcher } from '../use_data_fetcher';

const EMPTY_RESPONSE: FetchHistoricalSummaryResponse = {};

export interface UseFetchHistoricalSummaryResponse {
  data: FetchHistoricalSummaryResponse;
  loading: boolean;
  error: boolean;
}

export interface Params {
  sloIds: string[];
}

export function useFetchHistoricalSummary({
  sloIds = [],
}: Params): UseFetchHistoricalSummaryResponse {
  const [historicalSummary, setHistoricalSummary] = useState(EMPTY_RESPONSE);

  const params: Params = useMemo(() => ({ sloIds }), [sloIds]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: Params) => apiCallParams.sloIds.length > 0,
    []
  );

  const { data, loading, error } = useDataFetcher<Params, FetchHistoricalSummaryResponse>({
    paramsForApiCall: params,
    initialDataState: historicalSummary,
    executeApiCall: fetchHistoricalSummary,
    shouldExecuteApiCall,
  });

  useEffect(() => {
    setHistoricalSummary(data);
  }, [data]);

  return { data: historicalSummary, loading, error };
}

const fetchHistoricalSummary = async (
  params: Params,
  abortController: AbortController,
  http: HttpSetup
): Promise<FetchHistoricalSummaryResponse> => {
  try {
    const response = await http.post<FetchHistoricalSummaryResponse>(
      '/internal/observability/slos/_historical_summary',
      {
        body: JSON.stringify({ sloIds: params.sloIds }),
        signal: abortController.signal,
      }
    );

    return response;
  } catch (error) {
    // ignore error for retrieving slos
  }

  return EMPTY_RESPONSE;
};
