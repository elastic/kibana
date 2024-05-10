/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { useKibana } from '../utils/kibana_react';

type ApmIndex = string;

export interface UseFetchApmIndex {
  data: ApmIndex;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface ApiResponse {
  apmIndexSettings: Array<{
    configurationName: string;
    defaultValue: string;
    savedValue?: string;
  }>;
}

export function useFetchApmIndex(): UseFetchApmIndex {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchApmIndices'],
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<ApiResponse>('/internal/apm/settings/apm-index-settings', {
          signal,
        });

        const metricSettings = response.apmIndexSettings.find(
          (settings) => settings.configurationName === 'metric'
        );

        let index = '';
        if (!!metricSettings) {
          index = metricSettings.savedValue ?? metricSettings.defaultValue;
        }

        return index;
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
  });

  return {
    data: isInitialLoading ? '' : data ?? '',
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
