/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';

export interface InfrastructureAttributes {
  containerIds: string[];
  hostNames: string[];
  podNames: string[];
}

export const INITIAL_STATE: InfrastructureAttributes = {
  containerIds: [],
  hostNames: [],
  podNames: [],
};

export function useInfrastructureAttributes() {
  const { serviceName, agentName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo, detailTab },
  } = useApmParams('/services/{serviceName}/infrastructure');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/infrastructure_attributes', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              agentName,
            },
          },
        });
      }
    },
    [environment, kuery, agentName, serviceName, start, end]
  );

  return {
    agentName,
    data,
    detailTab,
    end,
    start,
    status,
  };
}
