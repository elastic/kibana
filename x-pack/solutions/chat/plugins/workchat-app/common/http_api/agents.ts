/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentCreateRequest } from '../agents';

export interface ListAgentResponse {
  agents: Agent[];
}

export type GetAgentResponse = Agent;

export type CreateAgentPayload = Omit<AgentCreateRequest, 'id'>;

export type CreateAgentResponse = { success: false } | { success: true; agent: Agent };

export type UpdateAgentPayload = Omit<AgentCreateRequest, 'id'>;

export type UpdateAgentResponse = { success: false } | { success: true; agent: Agent };

export type DeleteAgentResponse = { success: false } | { success: true };
