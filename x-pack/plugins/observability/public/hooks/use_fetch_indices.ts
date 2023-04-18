/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';

export interface UseFetchIndicesResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  indices: Index[] | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<Index[], unknown>>;
}
export interface Index {
  name: string;
}

export function useFetchIndices(): UseFetchIndicesResponse {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchIndices'],
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<Index[]>(`/api/index_management/indices`, { signal });
        return response;
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
  });

  return { isLoading, isError, isSuccess, indices: data, refetch };
}
