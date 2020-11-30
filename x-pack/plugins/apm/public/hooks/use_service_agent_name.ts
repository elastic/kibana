/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
import { useFetcher } from './useFetcher';
import { useUrlParams } from './useUrlParams';

export function useServiceAgentName() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;
  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/agent_name',
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [serviceName, start, end]
  );

  return { agentName: data?.agentName, status, error };
}
