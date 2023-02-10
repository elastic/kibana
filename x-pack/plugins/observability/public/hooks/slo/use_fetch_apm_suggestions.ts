/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataFetcher } from '../use_data_fetcher';

export type Suggestion = string;
export interface UseFetchApmSuggestions {
  data: Suggestion[];
  loading: boolean;
  error: boolean;
}

export interface Params {
  fieldName: string;
  search: string;
}

interface ApiResponse {
  terms: string[];
}

const EMPTY_RESPONSE: ApiResponse = { terms: [] };

export function useFetchApmSuggestions({ fieldName, search = '' }: Params): UseFetchApmSuggestions {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const params: Params = useMemo(() => ({ fieldName, search }), [fieldName, search]);
  const shouldExecuteApiCall = useCallback(
    (apiCallParams: Params) => !apiCallParams.search || apiCallParams.search.length > 0,
    []
  );

  const { data, loading, error } = useDataFetcher<Params, ApiResponse>({
    paramsForApiCall: params,
    initialDataState: EMPTY_RESPONSE,
    executeApiCall: fetchHistoricalSummary,
    shouldExecuteApiCall,
  });

  useEffect(() => {
    setSuggestions(data.terms);
  }, [data]);

  return { data: suggestions, loading, error };
}

const fetchHistoricalSummary = async (
  params: Params,
  abortController: AbortController,
  http: HttpSetup
): Promise<ApiResponse> => {
  try {
    const response = await http.get<ApiResponse>('/internal/apm/suggestions', {
      query: {
        fieldName: params.fieldName,
        start: moment().subtract(2, 'days').toISOString(),
        end: moment().toISOString(),
        fieldValue: params.search,
      },
      signal: abortController.signal,
    });

    return response;
  } catch (error) {
    // ignore error for retrieving slos
  }

  return { terms: [] };
};
