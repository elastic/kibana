/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentStatusMocks } from '../../../../../common/endpoint/service/response_actions/mocks/agent_status.mocks';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { AgentStatusRecords } from '../../../../../common/endpoint/types';

const useGetAgentStatusMock = jest.fn(
  (agentIds: string[] | string, agentType: ResponseActionAgentType) => {
    const agentsIdList = Array.isArray(agentIds) ? agentIds : [agentIds];

    return {
      data: agentsIdList.reduce<AgentStatusRecords>((acc, agentId) => {
        acc[agentId] = agentStatusMocks.generateAgentStatus({ agentType, agentId });

        return acc;
      }, {}),
      isLoading: false,
      isFetched: true,
      isFetching: false,
    };
  }
);

export { useGetAgentStatusMock as useGetAgentStatus };
