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
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AGENT_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import type { AgentStatusInfo, AgentStatusRecords } from '../../../../common/endpoint/types';
import { useHttp } from '../../../common/lib/kibana';

interface ErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<SentinelOneGetAgentsResponse>;
}

// TODO:
// 8.14
// Remove this function when
// agentStatusClientEnabled is enabled/removed
export const useGetSentinelOneAgentStatus = (
  agentIds: string[],
  agentType?: string,
  options: UseQueryOptions<AgentStatusInfo, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<AgentStatusInfo, IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  return useQuery<AgentStatusInfo, IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentIds],
    ...options,
    // TODO: update this to use a function instead of a number
    refetchInterval: 2000,
    queryFn: () =>
      http
        .get<{ data: AgentStatusInfo }>(AGENT_STATUS_ROUTE, {
          version: '1',
          query: {
            agentIds,
            // 8.13 sentinel_one support via internal API
            agentType: agentType ? agentType : 'sentinel_one',
          },
        })
        .then((response) => response.data),
  });
};

export const useGetAgentStatus = (
  agentIds: string[],
  agentType: string,
  options: UseQueryOptions<AgentStatusRecords, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<AgentStatusRecords, IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  return useQuery<AgentStatusRecords, IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentIds],
    ...options,
    // TODO: remove this refetchInterval and instead override it where called, via options.
    refetchInterval: 2000,
    queryFn: () =>
      http
        .get<{ data: AgentStatusRecords }>(AGENT_STATUS_ROUTE, {
          version: '1',
          query: {
            agentIds: agentIds.filter((agentId) => agentId.trim().length),
            agentType,
          },
        })
        .then((response) => response.data),
  });
};

export const useAgentStatusHook = () => {
  const agentStatusClientEnabled = useIsExperimentalFeatureEnabled('agentStatusClientEnabled');
  // 8.14 use agent status client hook if FF enabled
  return !agentStatusClientEnabled ? useGetSentinelOneAgentStatus : useGetAgentStatus;
};
