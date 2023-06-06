/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FindCompositeSLOResponse } from '@kbn/slo-schema';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { useState } from 'react';
import { useKibana } from '../../utils/kibana_react';
import { compositeSloKeys } from './query_key_factory';

interface Params {
  page?: number;
  sortBy?: string;
  shouldRefetch?: boolean;
}

export interface UseFetchCompositeSloListResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindCompositeSLOResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<FindCompositeSLOResponse | undefined, unknown>>;
}

const SHORT_REFETCH_INTERVAL = 1000 * 5; // 5 seconds
const LONG_REFETCH_INTERVAL = 1000 * 60; // 1 minute

export function useFetchCompositeSloList({
  page = 1,
  sortBy = 'creationTime',
  shouldRefetch,
}: Params | undefined = {}): UseFetchCompositeSloListResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [stateRefetchInterval, setStateRefetchInterval] = useState<number | undefined>(
    SHORT_REFETCH_INTERVAL
  );

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: compositeSloKeys.list({ page, sortBy }),
      queryFn: async ({ signal }) => {
        try {
          const response = await http.get<FindCompositeSLOResponse>(
            `/api/observability/composite_slos`,
            {
              query: {
                ...(page && { page }),
                ...(sortBy && { sortBy }),
              },
              signal,
            }
          );

          return response;
        } catch (error) {
          throw error;
        }
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchInterval: shouldRefetch ? stateRefetchInterval : undefined,
      staleTime: 1000,
      retry: (failureCount, error) => {
        if (String(error) === 'Error: Forbidden') {
          return false;
        }
        return failureCount < 4;
      },
      onSuccess: ({ results }: FindCompositeSLOResponse) => {
        if (!shouldRefetch) {
          return;
        }

        if (results.find((slo) => slo.summary.status === 'NO_DATA' || !slo.summary)) {
          setStateRefetchInterval(SHORT_REFETCH_INTERVAL);
        } else {
          setStateRefetchInterval(LONG_REFETCH_INTERVAL);
        }
      },
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.observability.slo.list.errorNotification', {
            defaultMessage: 'Something went wrong while fetching composite SLOs',
          }),
        });
      },
    }
  );

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
