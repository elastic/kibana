/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { AgentService, AgentStatus } from '../../common/types';
import { getAgent, getAgentStatus } from './agents';

export const createAgentService = (): AgentService => {
  return {
    getAgentStatus: async (
      requestHandlerContext: RequestHandlerContext,
      agentId: string
    ): Promise<AgentStatus> => {
      const agent = await getAgent(requestHandlerContext.core.savedObjects.client, agentId);
      return getAgentStatus(agent);
    },
  };
};
