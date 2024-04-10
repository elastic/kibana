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
import { AGENT_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import type { AgentStatusApiResponse } from '../../../../common/endpoint/types';
import { useHttp } from '../../../common/lib/kibana';

interface ErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;
}

export const useGetSentinelOneAgentStatus = (
  agentIds: string[],
  options: UseQueryOptions<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>> = {}
): UseQueryResult<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  return useQuery<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentIds],
    ...options,
    // TODO: update this to use a function instead of a number
    refetchInterval: 2000,
    queryFn: () =>
      http
        .get<{ data: AgentStatusApiResponse['data'] }>(AGENT_STATUS_ROUTE, {
          version: '1',
          query: {
            agentIds,
            // 8.13 sentinel_one support via internal API
            agentType: 'sentinel_one',
          },
        })
        .then((response) => response.data),
  });
};
