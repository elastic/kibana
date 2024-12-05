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
import { useEffect, useRef } from 'react';
import { useKibana } from '../../../../../../common/lib/kibana';

interface UseFetchOngoingScansConfig {
  isPolling: boolean;
  endpointId: string;
  onSuccess: () => void;
}

export const useFetchOngoingScans = ({
  isPolling,
  endpointId,
  onSuccess,
}: UseFetchOngoingScansConfig) => {
  const { http } = useKibana().services;

  // Ref to track if polling was active in the previous render
  const wasPolling = useRef(isPolling);

  useEffect(() => {
    // If polling was active and isPolling is false, it means the condition has been met and we can run onSuccess logic (i.e. refetch insights)
    if (wasPolling.current && !isPolling) {
      onSuccess();
    }
    wasPolling.current = isPolling;
  }, [isPolling, onSuccess]);

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
      refetchInterval: isPolling ? 2000 : false,
      select: (response) => {
        return response.data;
      },
    }
  );
};
