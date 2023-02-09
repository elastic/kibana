/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';

import { FindSLOResponse } from '@kbn/slo-schema';
import { useDataFetcher } from '../use_data_fetcher';

const EMPTY_LIST: FindSLOResponse = {
  results: [],
  total: 0,
  page: 0,
  perPage: 0,
};

interface SLOListParams {
  name?: string;
  page?: number;
  sortBy?: string;
  indicatorTypes?: string[];
}

export interface UseFetchSloListResponse {
  sloList: FindSLOResponse;
  loading: boolean;
  error: boolean;
}

export function useFetchSloList({
  name,
  page,
  refetch,
  sortBy,
  indicatorTypes,
}: SLOListParams & {
  refetch: boolean;
}): UseFetchSloListResponse {
  const [sloList, setSloList] = useState(EMPTY_LIST);

  const params: SLOListParams = useMemo(
    () => ({ name, page, sortBy, indicatorTypes }),
    [name, page, sortBy, indicatorTypes]
  );
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: SLOListParams) =>
      apiCallParams.name === params.name ||
      apiCallParams.page === params.page ||
      apiCallParams.sortBy === params.sortBy ||
      apiCallParams.indicatorTypes === params.indicatorTypes ||
      refetch,
    [params, refetch]
  );

  const { data, loading, error } = useDataFetcher<SLOListParams, FindSLOResponse>({
    paramsForApiCall: params,
    initialDataState: sloList,
    executeApiCall: fetchSloList,
    shouldExecuteApiCall,
  });

  useEffect(() => {
    setSloList(data);
  }, [data]);

  return { sloList, loading, error };
}

const fetchSloList = async (
  params: SLOListParams,
  abortController: AbortController,
  http: HttpSetup
): Promise<FindSLOResponse> => {
  try {
    const response = await http.get<FindSLOResponse>(`/api/observability/slos`, {
      query: {
        ...(params.page && { page: params.page }),
        ...(params.name && { name: params.name }),
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.indicatorTypes &&
          params.indicatorTypes.length > 0 && { indicatorTypes: params.indicatorTypes.join(',') }),
      },
      signal: abortController.signal,
    });

    return response;
  } catch (error) {
    // ignore error for retrieving slos
  }

  return EMPTY_LIST;
};
