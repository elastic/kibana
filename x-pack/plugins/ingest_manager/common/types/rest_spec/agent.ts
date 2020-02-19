/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent, AgentEventSchema, AgentTypeSchema, AgentEvent } from '../models';

export interface GetAgentsRequestSchema {
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

export interface GetOneAgentRequestSchema {
  params: {
    agentId: string;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
  success: boolean;
}

export interface PostAgentCheckinRequestSchema {
  params: {
    agentId: string;
  };
  body: {
    local_metadata?: Record<string, any>;
    events?: AgentEventSchema[];
  };
}

export interface PostAgentEnrollRequestSchema {
  body: {
    type: AgentTypeSchema;
    shared_id?: string;
    metadata: {
      local: Record<string, any>;
      user_provided: Record<string, any>;
    };
  };
}

export interface PostAgentAcksRequestSchema {
  body: {
    action_ids: string[];
  };
  params: {
    agentId: string;
  };
}

export interface PostAgentUnenrollRequestSchema {
  body: { kuery: string } | { ids: string[] };
}

export interface PostAgentUnenrollResponse {
  results: Array<{
    success: boolean;
    error?: any;
    id: string;
    action: string;
  }>;
  success: boolean;
}

export interface GetOneAgentEventsRequestSchema {
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

export interface DeleteAgentRequestSchema {
  params: {
    agentId: string;
  };
}

export interface UpdateAgentRequestSchema {
  params: {
    agentId: string;
  };
  body: {
    user_provided_metadata: Record<string, any>;
  };
}

export interface GetAgentStatusForPolicySchema {
  params: {
    policyId: string;
  };
}
