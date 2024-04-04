/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CreateSLOInput, SLODefinitionResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';

interface SLOInspectResponse {
  slo: SLODefinitionResponse;
  pipeline: Record<string, any>;
  rollUpTransform: TransformPutTransformRequest;
  summaryTransform: TransformPutTransformRequest;
  temporaryDoc: Record<string, any>;
}

export interface UseInspectSLOResponse {
  data: SLOInspectResponse | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function useFetchSloInspect(slo: CreateSLOInput, shouldInspect: boolean) {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['slo', 'inspect'],
    queryFn: async ({ signal }) => {
      try {
        const body = JSON.stringify(slo);
        const response = await http.post<SLOInspectResponse>(
          '/internal/api/observability/slos/_inspect',
          {
            body,
            signal,
          }
        );

        return response;
      } catch (error) {
        // ignore error
      }
    },
    enabled: shouldInspect,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
  };
}
