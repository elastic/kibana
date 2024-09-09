/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { GetSLOSuggestionsResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../utils/kibana_react';

export function useFetchSLOSuggestions() {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchSLOSuggestions'],
    queryFn: async ({ signal }) => {
      try {
        return await http.get<GetSLOSuggestionsResponse>(
          '/internal/observability/slos/suggestions',
          {
            signal,
          }
        );
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    suggestions: data,
    isLoading,
    isSuccess,
    isError,
  };
}
