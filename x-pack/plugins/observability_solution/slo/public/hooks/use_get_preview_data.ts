/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPreviewDataResponse, Indicator, Objective } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export interface UseGetPreviewData {
  data: GetPreviewDataResponse | undefined;
  isInitialLoading: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function useGetPreviewData({
  isValid,
  range,
  indicator,
  objective,
  groupBy,
  groupings,
  instanceId,
}: {
  isValid: boolean;
  groupBy?: string;
  instanceId?: string;
  groupings?: Record<string, unknown>;
  objective?: Objective;
  indicator: Indicator;
  range: { start: number; end: number };
}): UseGetPreviewData {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, data } = useQuery({
    queryKey: sloKeys.preview(indicator, range, groupings),
    queryFn: async ({ signal }) => {
      const response = await http.post<GetPreviewDataResponse>(
        '/internal/observability/slos/_preview',
        {
          body: JSON.stringify({
            indicator,
            range,
            groupBy,
            instanceId,
            groupings,
            ...(objective ? { objective } : null),
          }),
          signal,
        }
      );

      return Array.isArray(response) ? response : [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isValid,
  });

  return {
    data,
    isLoading,
    isInitialLoading,
    isSuccess,
    isError,
  };
}
