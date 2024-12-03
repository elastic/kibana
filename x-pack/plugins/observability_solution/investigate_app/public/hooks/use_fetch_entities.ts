/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { GetEntitiesResponse } from '@kbn/investigation-shared';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

export interface EntityParams {
  investigationId: string;
  serviceName?: string;
  serviceEnvironment?: string;
  hostName?: string;
  containerId?: string;
}

export function useFetchEntities({
  investigationId,
  serviceName,
  serviceEnvironment,
  hostName,
  containerId,
}: EntityParams) {
  const {
    core: { http },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.entities({
      investigationId,
      serviceName,
      serviceEnvironment,
      hostName,
      containerId,
    }),
    queryFn: async ({ signal }) => {
      return await http.get<GetEntitiesResponse>('/api/observability/investigation/entities', {
        query: {
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          'host.name': hostName,
          'container.id': containerId,
        },
        version: '2023-10-31',
        signal,
      });
    },
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error: Error) => {
      // ignore error
    },
    enabled: Boolean(investigationId && (serviceName || hostName || containerId)),
  });

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
