/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HttpSetup } from '@kbn/core/public';

import type { SLO, SLOList } from '../../typings/slo';
import { useDataFetcher } from '../use_data_fetcher';

const EMPTY_LIST: SLOList = {
  results: [],
  total: 0,
  page: 0,
  perPage: 0,
};

interface SLOListParams {
  name?: string;
}

export interface UseFetchSloListResponse {
  loading: boolean;
  sloList: SLOList;
}

export function useFetchSloList({
  name,
  refetch,
}: {
  refetch: boolean;
  name?: string;
}): UseFetchSloListResponse {
  const [sloList, setSloList] = useState(EMPTY_LIST);
  const params: SLOListParams = useMemo(() => ({ name }), [name]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: SLOListParams) => apiCallParams.name === params.name || refetch,
    [params, refetch]
  );

  const { loading, data } = useDataFetcher<SLOListParams, SLOList>({
    paramsForApiCall: params,
    initialDataState: sloList,
    executeApiCall: fetchSloList,
    shouldExecuteApiCall,
  });

  useEffect(() => {
    setSloList(data);
  }, [data]);

  return { loading, sloList };
}

const fetchSloList = async (
  params: SLOListParams,
  abortController: AbortController,
  http: HttpSetup
): Promise<SLOList> => {
  try {
    const response = await http.get<Record<string, unknown>>(`/api/observability/slos`, {
      query: {
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
    results: response.results.map((result) => toSLO(result)),
    page: Number(response.page),
    perPage: Number(response.per_page),
    total: Number(response.total),
  };
}

function toSLO(result: any): SLO {
  return {
    id: String(result.id),
    name: String(result.name),
    objective: { target: Number(result.objective.target) },
    summary: {
      sliValue: Number(result.summary.sli_value),
      errorBudget: {
        remaining: Number(result.summary.error_budget.remaining),
      },
    },
  };
}
