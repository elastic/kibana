/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type {
  GetClusterHealthResponse,
  HealthIntervalParameters,
} from '../../../../../common/api/detection_engine';
import { GET_CLUSTER_HEALTH_URL } from '../../../../../common/api/detection_engine';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchClusterHealth } from '../fetch_cluster_health';

const GET_CLUSTER_HEALTH_QUERY_KEY = ['POST', GET_CLUSTER_HEALTH_URL];

export function useFetchClusterHealthQuery(
  interval?: HealthIntervalParameters,
  options?: UseQueryOptions<GetClusterHealthResponse>
): UseQueryResult<GetClusterHealthResponse> {
  const { addError } = useAppToasts();

  return useQuery<GetClusterHealthResponse>(
    [...GET_CLUSTER_HEALTH_QUERY_KEY, interval],
    ({ signal }) => fetchClusterHealth({ interval, signal }),
    {
      refetchIntervalInBackground: false,
      staleTime: 5 * 60000, // 5 minutes
      ...options,
      onError: (error) => {
        addError(error, {
          title: 'Unable to fetch cluster health',
        });
      },
    }
  );
}
