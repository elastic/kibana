/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient } from './agent_client';
import type { AgentService } from './agent_service';

const createAgentClientMock = () => {
  const mocked: jest.Mocked<AgentClient> = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return mocked;
};

const createAgentServiceMock = () => {
  const mocked: jest.Mocked<AgentService> = {
    getScopedClient: jest.fn().mockReturnValue(createAgentClientMock()),
  };
  return mocked;
};

export const agentMocks = {
  create: createAgentServiceMock,
  createClient: createAgentClientMock,
};
