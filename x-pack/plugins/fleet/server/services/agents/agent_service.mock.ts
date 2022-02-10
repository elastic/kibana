/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient, AgentService } from './agent_service';

const createClientMock = (): jest.Mocked<AgentClient> => ({
  getAgent: jest.fn(),
  getAgentStatusById: jest.fn(),
  getAgentStatusForAgentPolicy: jest.fn(),
  listAgents: jest.fn(),
});

const createServiceMock = (): jest.Mocked<AgentService> => ({
  asInternalUser: createClientMock(),
  asScoped: jest.fn().mockReturnValue(createClientMock()),
});

export const agentServiceMock = {
  createClient: createClientMock,
  create: createServiceMock,
};
