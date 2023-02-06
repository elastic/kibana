/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useMemo } from 'react';
import { GetSLOResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useDataFetcher } from '../use_data_fetcher';

export interface UseFetchSloDetailsResponse {
  loading: boolean;
  slo: SLOWithSummaryResponse | undefined;
}

export function useFetchSloDetails(sloId?: string): UseFetchSloDetailsResponse {
  const params = useMemo(() => ({ sloId }), [sloId]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: { sloId?: string }) => params.sloId === apiCallParams.sloId,
    [params]
  );

  const { loading, data: slo } = useDataFetcher<
    { sloId?: string },
    SLOWithSummaryResponse | undefined
  >({
    paramsForApiCall: params,
    initialDataState: undefined,
    executeApiCall: fetchSlo,
    shouldExecuteApiCall,
  });

  return { loading, slo };
}

const fetchSlo = async (
  params: { sloId?: string },
  abortController: AbortController,
  http: HttpSetup
): Promise<SLOWithSummaryResponse | undefined> => {
  if (params.sloId === undefined) {
    return undefined;
  }

  try {
    const response = await http.get<GetSLOResponse>(`/api/observability/slos/${params.sloId}`, {
      query: {},
      signal: abortController.signal,
    });

    return response;
  } catch (error) {
    // ignore error for retrieving slos
  }

  return undefined;
};
