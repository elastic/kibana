/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { useKibana } from '../../utils/kibana_react';

export interface Suggestion {
  label: string;
  value: string;
  count: number;
}

export interface UseFetchSyntheticsSuggestions {
  suggestions: Record<string, Suggestion[]>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface Params {
  filters?: {
    locations: string[];
    monitorIds: string[];
    tags: string[];
    projects: string[];
  };
}

type ApiResponse = Record<string, Suggestion[]>;

export function useFetchSyntheticsSuggestions({ filters }: Params): UseFetchSyntheticsSuggestions {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchSyntheticsSuggestions', filters],
    queryFn: async ({ signal }) => {
      try {
        const suggestions = await http.get<ApiResponse>('/internal/synthetics/suggestions', {
          query: {
            locations: filters?.locations || [],
            monitorQueryIds: filters?.monitorIds || [],
            tags: filters?.tags || [],
            projects: filters?.projects || [],
          },
          signal,
        });

        return suggestions;
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    suggestions: isInitialLoading ? {} : data ?? {},
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
