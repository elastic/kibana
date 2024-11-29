/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOInstancesResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { sloKeys } from '../../../hooks/query_key_factory';
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface Params {
  sloId: string;
  groupingKey?: string;
  afterKey?: string;
  search?: string;
}

interface UseFetchSloInstancesResponse {
  data: GetSLOInstancesResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useFetchSloInstances({
  sloId,
  groupingKey,
  afterKey,
  search,
}: Params): UseFetchSloInstancesResponse {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.instances({ sloId, groupingKey, afterKey, search }),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch(`GET /internal/observability/slos/{id}/_instances`, {
          params: {
            path: { id: sloId },
            query: { search, groupingKey, afterKey, excludeStale: true },
          },
          signal,
        });
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, data };
}
