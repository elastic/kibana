/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { GetAgentStatusResponse } from '@kbn/fleet-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { agentRouteService, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { useHttp } from '../../../common/lib/kibana';

type EndpointPolicyAgentSummary = GetAgentStatusResponse['results'];

export const useFetchAgentByAgentPolicySummary = (
  /**
   * The Fleet Agent Policy IDs (NOT the endpoint policy id)
   */
  agentPolicyIds: string[],
  options: Omit<UseQueryOptions<EndpointPolicyAgentSummary, IHttpFetchError>, 'queryFn'> = {}
): UseQueryResult<EndpointPolicyAgentSummary, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<EndpointPolicyAgentSummary, IHttpFetchError>({
    queryKey: ['get-policy-agent-summary', agentPolicyIds],
    ...options,
    queryFn: async () => {
      return (
        await http.get<GetAgentStatusResponse>(agentRouteService.getStatusPath(), {
          query:
            agentPolicyIds.length === 1
              ? { policyId: agentPolicyIds[0] }
              : {
                  kuery: agentPolicyIds.map((id) => `policy_id:${id}`).join(' OR '),
                },
          version: API_VERSIONS.public.v1,
        })
      ).results;
    },
  });
};
