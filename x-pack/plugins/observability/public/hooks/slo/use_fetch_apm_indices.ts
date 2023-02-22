/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback } from 'react';
import { useDataFetcher } from '../use_data_fetcher';

type ApmIndex = string;

export interface UseFetchApmIndex {
  data: ApmIndex;
  loading: boolean;
  error: boolean;
}

interface ApiResponse {
  apmIndexSettings: Array<{
    configurationName: string;
    defaultValue: string;
    savedValue?: string;
  }>;
}

export function useFetchApmIndex(): UseFetchApmIndex {
  const shouldExecuteApiCall = useCallback(() => true, []);

  const { data, loading, error } = useDataFetcher<null, ApmIndex>({
    paramsForApiCall: null,
    initialDataState: '',
    executeApiCall: fetchApmIndices,
    shouldExecuteApiCall,
  });

  return { data, loading, error };
}

const fetchApmIndices = async (
  params: null,
  abortController: AbortController,
  http: HttpSetup
): Promise<ApmIndex> => {
  try {
    const response = await http.get<ApiResponse>('/internal/apm/settings/apm-index-settings', {
      signal: abortController.signal,
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

  return '';
};
