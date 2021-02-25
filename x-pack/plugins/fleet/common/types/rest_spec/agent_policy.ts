/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPolicy, NewAgentPolicy, FullAgentPolicy } from '../models';
import { ListWithKuery } from './common';

export interface GetAgentPoliciesRequest {
  query: ListWithKuery & {
    full?: boolean;
  };
}

export type GetAgentPoliciesResponseItem = AgentPolicy & { agents?: number };

export interface GetAgentPoliciesResponse {
  items: GetAgentPoliciesResponseItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface GetOneAgentPolicyRequest {
  params: {
    agentPolicyId: string;
  };
}

export interface GetOneAgentPolicyResponse {
  item: AgentPolicy;
}

export interface CreateAgentPolicyRequest {
  body: NewAgentPolicy;
}

export interface CreateAgentPolicyResponse {
  item: AgentPolicy;
}

export type UpdateAgentPolicyRequest = GetOneAgentPolicyRequest & {
  body: NewAgentPolicy;
};

export interface UpdateAgentPolicyResponse {
  item: AgentPolicy;
}

export interface CopyAgentPolicyRequest {
  body: Pick<AgentPolicy, 'name' | 'description'>;
}

export interface CopyAgentPolicyResponse {
  item: AgentPolicy;
}

export interface DeleteAgentPolicyRequest {
  body: {
    agentPolicyId: string;
  };
}

export interface DeleteAgentPolicyResponse {
  id: string;
  name: string;
}

export interface GetFullAgentPolicyRequest {
  params: {
    agentPolicyId: string;
  };
}

export interface GetFullAgentPolicyResponse {
  item: FullAgentPolicy;
}
