/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelOneGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';
import { AGENT_STATUS_ROUTE } from '../../../common/endpoint/constants';
import type { AgentStatusApiResponse } from '../../../common/endpoint/types';
import { KibanaServices, useHttp } from '../lib/kibana';

interface ErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;
}

export const useAgentStatus = (
  _agentIds: string[],
  agentType: ResponseActionAgentType,
  options: UseQueryOptions<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>> = {}
): UseQueryResult<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>> => {
  const agentIds = _agentIds.filter((agentId) => agentId.trim().length);

  const http = useHttp();

  return useQuery<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentIds],
    ...options,
    queryFn: () =>
      http
        .get<{ data: AgentStatusApiResponse['data'] }>(AGENT_STATUS_ROUTE, {
          version: '1',
          query: {
            agentIds,
            agentType,
          },
        })
        .then((response) => response.data),
  });
};

// TODO: Remove this function when endpoint list is ported
//  to use tanstack-query instead of redux
export const fetchEndpointPendingActionsByAgentId = async (
  agentIds: string[]
): Promise<AgentStatusApiResponse['data'][string]> => {
  const response = await KibanaServices.get().http.get<AgentStatusApiResponse['data']>(
    AGENT_STATUS_ROUTE,
    {
      version: '1',
      query: {
        agentIds,
        agentType: 'endpoint',
      },
    }
  );
  return response.data;
};
