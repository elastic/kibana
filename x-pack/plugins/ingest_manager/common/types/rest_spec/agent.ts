/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Agent,
  AgentAction,
  NewAgentAction,
  NewAgentEvent,
  AgentEvent,
  AgentStatus,
  AgentType,
} from '../models';

export interface GetAgentsRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
    showInactive: boolean;
    showUpgradeable?: boolean;
  };
}

export interface GetAgentsResponse {
  list: Agent[];
  total: number;
  totalInactive: number;
  page: number;
  perPage: number;
}

export interface GetOneAgentRequest {
  params: {
    agentId: string;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
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
  item: AgentAction;
}

export interface PostAgentUnenrollRequest {
  params: {
    agentId: string;
  };
  body: {
    force?: boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUnenrollResponse {}

export interface PostBulkAgentUnenrollRequest {
  body: {
    agents: string[] | string;
    force?: boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostBulkAgentUnenrollResponse {}

export interface PostAgentUpgradeRequest {
  params: {
    agentId: string;
  };
  body: {
    source_uri?: string;
    version: string;
  };
}

export interface PostBulkAgentUpgradeRequest {
  body: {
    agents: string[] | string;
    source_uri?: string;
    version: string;
  };
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostBulkAgentUpgradeResponse {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUpgradeResponse {}

export interface PutAgentReassignRequest {
  params: {
    agentId: string;
  };
  body: { policy_id: string };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PutAgentReassignResponse {}

export interface PostBulkAgentReassignRequest {
  body: {
    policy_id: string;
    agents: string[] | string;
  };
}

export interface PostBulkAgentReassignResponse {
  [key: string]: {
    success: boolean;
    error?: Error;
  };
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
    policyId?: string;
  };
}

export interface GetAgentStatusResponse {
  results: {
    events: number;
    total: number;
    online: number;
    error: number;
    offline: number;
    other: number;
  };
}
