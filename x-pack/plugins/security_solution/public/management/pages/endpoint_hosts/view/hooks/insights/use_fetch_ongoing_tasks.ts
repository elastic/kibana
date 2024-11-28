/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import {
  DEFEND_INSIGHTS,
  type DefendInsightsResponse,
  DefendInsightStatusEnum,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { useKibana } from '../../../../../../common/lib/kibana';

export const useFetchOngoingScans = (isPolling: boolean, endpointId: string) => {
  const { http } = useKibana().services;

  return useQuery<{ data: DefendInsightsResponse[] }, unknown, DefendInsightsResponse[]>(
    [`fetchOngoingTasks-${endpointId}`],
    () =>
      http.get<{ data: DefendInsightsResponse[] }>(DEFEND_INSIGHTS, {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        query: {
          status: DefendInsightStatusEnum.running,
          endpoint_ids: [endpointId],
        },
      }),
    {
      refetchInterval: isPolling ? 5000 : false,
      select: (response) => response.data,
    }
  );
};
