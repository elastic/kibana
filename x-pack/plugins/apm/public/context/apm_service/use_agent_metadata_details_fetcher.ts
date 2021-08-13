/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../hooks/use_fetcher';
import { useUrlParams } from '../url_params_context/use_url_params';
import { APIReturnType } from '../../services/rest/createCallApmApi';

export type AgentMetadataDetails = APIReturnType<'GET /api/apm/services/{serviceName}/metadata/details'>;

export function useAgentMetadataDetailsFetcher(serviceName?: string) {
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          isCachable: true,
          endpoint: 'GET /api/apm/services/{serviceName}/metadata/details',
          params: {
            path: { serviceName },
            query: { start, end },
          },
        });
      }
    },
    [serviceName, start, end]
  );

  return { agentMetadataDetails: data, agentMetadataDetailsStatus: status };
}
