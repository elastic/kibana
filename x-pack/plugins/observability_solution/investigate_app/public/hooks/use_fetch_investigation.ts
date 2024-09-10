/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetInvestigationResponse } from '@kbn/investigation-shared';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Params {
  id?: string;
  initialInvestigation?: GetInvestigationResponse;
}

export interface UseFetchInvestigationResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetInvestigationResponse | undefined, unknown>>;
  data: GetInvestigationResponse | undefined;
}

export function useFetchInvestigation({
  id,
  initialInvestigation,
}: Params): UseFetchInvestigationResponse {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: investigationKeys.fetch({ id: id! }),
      queryFn: async ({ signal }) => {
        return await http.get<GetInvestigationResponse>(`/api/observability/investigations/${id}`, {
          version: '2023-10-31',
          signal,
        });
      },
      enabled: Boolean(id),
      initialData: initialInvestigation,
      refetchOnWindowFocus: false,
      refetchInterval: 15 * 1000,
      refetchIntervalInBackground: false,
      onError: (error: Error) => {
        toasts.addError(error, {
          title: 'Something went wrong while fetching Investigations',
        });
      },
    }
  );

  return {
    data,
    refetch,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
