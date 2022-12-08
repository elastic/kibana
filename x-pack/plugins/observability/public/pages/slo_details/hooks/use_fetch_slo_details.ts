/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useMemo } from 'react';
import { toSLO } from '../../../utils/slo/slo';
import { useDataFetcher } from '../../../hooks/use_data_fetcher';
import { SLO } from '../../../typings';

interface UseFetchSloDetailsResponse {
  loading: boolean;
  slo: SLO | undefined;
}

function useFetchSloDetails(sloId: string): UseFetchSloDetailsResponse {
  const params = useMemo(() => ({ sloId }), [sloId]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: { sloId: string }) => params.sloId === apiCallParams.sloId,
    [params]
  );

  const { loading, data: slo } = useDataFetcher<{ sloId: string }, SLO | undefined>({
    paramsForApiCall: params,
    initialDataState: undefined,
    executeApiCall: fetchSlo,
    shouldExecuteApiCall,
  });

  return { loading, slo };
}

const fetchSlo = async (
  params: { sloId: string },
  abortController: AbortController,
  http: HttpSetup
): Promise<SLO | undefined> => {
  try {
    const response = await http.get<Record<string, unknown>>(
      `/api/observability/slos/${params.sloId}`,
      {
        query: {},
        signal: abortController.signal,
      }
    );
    if (response !== undefined) {
      return toSLO(response);
    }
  } catch (error) {
    // ignore error for retrieving slos
  }

  return undefined;
};

export type { UseFetchSloDetailsResponse };
export { useFetchSloDetails };
