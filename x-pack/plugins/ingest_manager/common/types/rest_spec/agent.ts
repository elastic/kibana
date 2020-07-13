/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Agent,
  AgentAction,
  NewAgentEvent,
  AgentEvent,
  AgentStatus,
  AgentType,
  NewAgentAction,
} from '../models';

export interface GetAgentsRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
    showInactive: boolean;
  };
}

export interface GetAgentsResponse {
  list: Agent[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOneAgentRequest {
  params: {
    agentId: string;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
  success: boolean;
}

export interface PostAgentCheckinRequest {
  params: {
    agentId: string;
  };
  body: {
    status?: 'online' | 'error' | 'degraded';
    local_metadata?: Record<string, any>;
    events?: NewAgentEvent[];
  };
}

export interface PostAgentCheckinResponse {
  action: string;
  success: boolean;
  actions: AgentAction[];
}

export interface PostAgentEnrollRequest {
  body: {
    type: AgentType;
    shared_id?: string;
    metadata: {
      local: Record<string, any>;
      user_provided: Record<string, any>;
    };
  };
}

export interface PostAgentEnrollResponse {
  action: string;
  success: boolean;
  item: Agent & { status: AgentStatus };
}

export interface PostAgentAcksRequest {
  body: {
    events: AgentEvent[];
  };
  params: {
    agentId: string;
  };
}

export interface PostAgentAcksResponse {
  action: string;
  success: boolean;
}

export interface PostNewAgentActionRequest {
  body: {
    action: NewAgentAction;
  };
  params: {
    agentId: string;
  };
}

export interface PostNewAgentActionResponse {
  success: boolean;
  item: AgentAction;
}

export interface PostAgentUnenrollRequest {
  params: {
    agentId: string;
  };
}

export interface PostAgentUnenrollResponse {
  success: boolean;
}

export interface PutAgentReassignRequest {
  params: {
    agentId: string;
  };
  body: { config_id: string };
}

export interface PutAgentReassignResponse {
  success: boolean;
}

export interface GetOneAgentEventsRequest {
  params: {
    agentId: string;
  };
  query: {
    page: number;
    perPage: number;
    kuery?: string;
  };
}

export interface GetOneAgentEventsResponse {
  list: AgentEvent[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface DeleteAgentRequest {
  params: {
    agentId: string;
  };
}

export interface UpdateAgentRequest {
  params: {
    agentId: string;
  };
  body: {
    user_provided_metadata: Record<string, any>;
  };
}

export interface GetAgentStatusRequest {
  query: {
    configId?: string;
  };
}

export interface GetAgentStatusResponse {
  success: boolean;
  results: {
    events: number;
    total: number;
    online: number;
    error: number;
    offline: number;
  };
}
