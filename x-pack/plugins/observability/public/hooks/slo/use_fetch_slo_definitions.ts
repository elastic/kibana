/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSloDefinitionsResponse, SLOResponse } from '@kbn/slo-schema';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export interface UseFetchSloDefinitionsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: SLOResponse[] | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<SLOResponse[], unknown>>;
}

interface Params {
  name?: string;
}

export function useFetchSloDefinitions({ name = '' }: Params): UseFetchSloDefinitionsResponse {
  const { http } = useKibana().services;
  const search = name.endsWith('*') ? name : `${name}*`;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.definitions(search),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<FindSloDefinitionsResponse>(
          '/internal/observability/slos/_definitions',
          {
            query: {
              search,
            },
            signal,
          }
        );

        return response;
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
