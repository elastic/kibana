/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { FindSLOResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';

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

export function useFetchSloList(params?: SLOListParams) {
  const { name, page, sortBy, indicatorTypes } = params || {};
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: ['fetchSloList', name, page, sortBy, indicatorTypes],
      queryFn: async ({ signal }) => {
        try {
          const response = await http.get<FindSLOResponse>(`/api/observability/slos`, {
            query: {
              ...(page && { page }),
              ...(name && { name }),
              ...(sortBy && { sortBy }),
              ...(indicatorTypes &&
                indicatorTypes.length > 0 && {
                  indicatorTypes: indicatorTypes.join(','),
                }),
            },
            signal,
          });

          return response;
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
    }
  );

  return {
    sloList: isInitialLoading ? EMPTY_LIST : data ?? EMPTY_LIST,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
