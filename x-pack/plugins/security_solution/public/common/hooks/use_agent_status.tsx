/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { SentinelOneGetAgentsResponse } from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';
import { AGENT_STATUS_ROUTE } from '../../../common/endpoint/constants';
import type { AgentStatusApiResponse } from '../../../common/endpoint/types';
import { useHttp } from '../lib/kibana';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';

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
  const sentinelOneManualHostActionsEnabled = useIsExperimentalFeatureEnabled(
    'sentinelOneManualHostActionsEnabled'
  );

  const isSentinelAgent = agentType === 'sentinel_one';
  const isEndpointAgent = agentType === 'endpoint';

  const agentIds = _agentIds.filter((agentId) => agentId.trim().length);

  const http = useHttp();

  return useQuery<AgentStatusApiResponse['data'], IHttpFetchError<ErrorType>>({
    queryKey: ['get-agent-status', agentIds],
    ...options,
    enabled:
      // Only fetch agent status if there are agentIds
      // and the agent type is either endpoint
      // or sentinel agent (when ff is enabled)
      !isEmpty(agentIds) &&
      (isEndpointAgent || (isSentinelAgent && sentinelOneManualHostActionsEnabled)),
    // TODO: update this to use a function instead of a number
    refetchInterval: 2000,
    queryFn: () =>
      http
        .get<{ data: AgentStatusApiResponse['data'] }>(AGENT_STATUS_ROUTE, {
          version: '2023-10-31',
          query: {
            agentIds,
            agentType,
          },
        })
        .then((response) => response.data),
  });
};
