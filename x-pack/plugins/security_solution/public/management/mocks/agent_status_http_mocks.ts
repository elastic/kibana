/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptionsWithPath } from '@kbn/core-http-browser';
import type { Mutable } from 'utility-types';
import type { EndpointAgentStatusRequestQueryParams } from '../../../common/api/endpoint/agent/get_agent_status_route';
import type { ResponseProvidersInterface } from '../../common/mock/endpoint';
import { httpHandlerMockFactory } from '../../common/mock/endpoint/http_handler_mock_factory';
import type { AgentStatusApiResponse, AgentStatusRecords } from '../../../common/endpoint/types';
import { HostStatus } from '../../../common/endpoint/types';
import { AGENT_STATUS_ROUTE } from '../../../common/endpoint/constants';

export type AgentStatusHttpMocksInterface = ResponseProvidersInterface<{
  getAgentStatus: (options: HttpFetchOptionsWithPath) => AgentStatusApiResponse;
}>;

export const agentStatusGetHttpMock = httpHandlerMockFactory<AgentStatusHttpMocksInterface>([
  {
    id: 'getAgentStatus',
    method: 'get',
    path: AGENT_STATUS_ROUTE,
    handler: (options): AgentStatusApiResponse => {
      const queryOptions = options.query as Mutable<EndpointAgentStatusRequestQueryParams>;
      const agentIds = Array.isArray(queryOptions.agentIds)
        ? queryOptions.agentIds
        : [queryOptions.agentIds];

      return {
        data: agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
          acc[agentId] = {
            agentId,
            agentType: queryOptions.agentType ?? 'endpoint',
            found: true,
            isolated: false,
            lastSeen: new Date().toISOString(),
            pendingActions: {},
            status: HostStatus.HEALTHY,
          };

          return acc;
        }, {}),
      };
    },
  },
]);
