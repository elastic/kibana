/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';

import type { SLOList } from '../../typings/slo';
import { useDataFetcher } from '../use_data_fetcher';
import { toSLO } from '../../utils/slo/slo';

const EMPTY_LIST: SLOList = {
  results: [],
  total: 0,
  page: 0,
  perPage: 0,
};

interface SLOListParams {
  name?: string;
  page?: number;
}

export interface UseFetchSloListResponse {
  sloList: SLOList;
  loading: boolean;
  error: boolean;
}

export function useFetchSloList({
  name,
  refetch,
  page,
}: {
  refetch: boolean;
  name?: string;
  page?: number;
}): UseFetchSloListResponse {
  const [sloList, setSloList] = useState(EMPTY_LIST);

  const params: SLOListParams = useMemo(() => ({ name, page }), [name, page]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: SLOListParams) =>
      apiCallParams.name === params.name || apiCallParams.page === params.page || refetch,
    [params, refetch]
  );

  const { data, loading, error } = useDataFetcher<SLOListParams, SLOList>({
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
): Promise<SLOList> => {
  try {
    const response = await http.get<Record<string, unknown>>(`/api/observability/slos`, {
      query: {
        ...(params.page && { page: params.page }),
        ...(params.name && { name: params.name }),
      },
      signal: abortController.signal,
    });
    if (response !== undefined) {
      return toSLOList(response);
    }
  } catch (error) {
    // ignore error for retrieving slos
  }

  return EMPTY_LIST;
};

function toSLOList(response: Record<string, unknown>): SLOList {
  if (!Array.isArray(response.results)) {
    throw new Error('Invalid response');
  }

  return {
    results: response.results.map(toSLO),
    page: Number(response.page),
    perPage: Number(response.per_page),
    total: Number(response.total),
  };
}
