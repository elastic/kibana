/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';
import { useServiceName } from './use_service_name';

export function useAgentName() {
  const serviceName = useServiceName();
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;

  const { data: agentName, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/agent_name',
          params: {
            path: { serviceName },
            query: { start, end },
          },
        }).then((res) => res.agentName);
      }
    },
    [serviceName, start, end]
  );

  return {
    agentName,
    status,
    error,
  };
}
