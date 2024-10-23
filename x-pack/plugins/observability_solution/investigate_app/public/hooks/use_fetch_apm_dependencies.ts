/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { APMServerRouteRepository } from '@kbn/apm-plugin/server';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

export interface APMDepenendenciesParams {
  investigationId: string;
  start: string;
  end: string;
  serviceName?: string;
  serviceEnvironment?: string;
}
export type APMReturnType = ReturnType<
  APMServerRouteRepository['GET /internal/apm/assistant/get_downstream_dependencies']['handler']
>;

export function useFetchAPMDependencies({
  investigationId,
  serviceName,
  serviceEnvironment,
  start,
  end,
}: APMDepenendenciesParams) {
  const {
    core: { http },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.apmDependencies({
      investigationId,
      serviceName,
      serviceEnvironment,
      start,
      end,
    }),
    queryFn: async ({ signal }) => {
      return await http.get<APMReturnType>('/internal/apm/assistant/get_downstream_dependencies', {
        query: {
          serviceName,
          start,
          end,
        },
        version: '2023-10-31',
        signal,
      });
    },
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      // ignore error
    },
    enabled: Boolean(investigationId && serviceName && start && end),
  });

  return {
    data: { content: data?.content?.filter((dependency) => !!dependency) || [] },
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
