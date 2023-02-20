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
import moment from 'moment';
import { useKibana } from '../../utils/kibana_react';

export type Suggestion = string;

export interface UseFetchApmSuggestions {
  suggestions: Suggestion[];
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<string[] | undefined, unknown>>;
}

export interface Params {
  fieldName: string;
  search?: string;
}

interface ApiResponse {
  terms: string[];
}

const NO_SUGGESTIONS: Suggestion[] = [];

export function useFetchApmSuggestions({ fieldName, search = '' }: Params): UseFetchApmSuggestions {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: ['fetchApmSuggestions', fieldName, search],
      queryFn: async ({ signal }) => {
        try {
          const { terms = [] } = await http.get<ApiResponse>('/internal/apm/suggestions', {
            query: {
              fieldName,
              start: moment().subtract(2, 'days').toISOString(),
              end: moment().toISOString(),
              fieldValue: search,
            },
            signal,
          });

          return terms;
        } catch (error) {
          // ignore error
        }
      },
    }
  );

  return {
    suggestions: isInitialLoading ? NO_SUGGESTIONS : data ?? NO_SUGGESTIONS,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
