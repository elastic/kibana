/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOInstancesResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export interface UseFetchSloInstancesResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetSLOInstancesResponse | undefined;
}

export function useFetchSloInstances({ sloId }: { sloId?: string }): UseFetchSloInstancesResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.detail(sloId),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<GetSLOInstancesResponse>(
          `/internal/observability/slos/${sloId}/_instances`,
          {
            query: {},
            signal,
          }
        );

        return response;
      } catch (error) {
        // ignore error for retrieving slos
      }
    },
    keepPreviousData: true,
    enabled: Boolean(sloId),
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
