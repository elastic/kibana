/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, FetchSLOHealthResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export interface UseFetchSloHealth {
  data: FetchSLOHealthResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export interface Params {
  list: SLOWithSummaryResponse[];
}

export function useFetchSloHealth({ list }: Params): UseFetchSloHealth {
  const { http } = useKibana().services;
  const payload = list.map((slo) => ({
    sloId: slo.id,
    sloInstanceId: slo.instanceId ?? ALL_VALUE,
  }));

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.health(payload),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.post<FetchSLOHealthResponse>(
          '/internal/observability/slos/_health',
          {
            body: JSON.stringify({ list: payload }),
            signal,
          }
        );

        return response;
      } catch (error) {
        // ignore error
      }
    },
    enabled: Boolean(list.length > 0),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isError,
  };
}
