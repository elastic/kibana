/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  success: boolean;
}

export interface GetOneAgentPolicyRequest {
  params: {
    agentPolicyId: string;
  };
}

export interface GetOneAgentPolicyResponse {
  item: AgentPolicy;
  success: boolean;
}

export interface CreateAgentPolicyRequest {
  body: NewAgentPolicy;
}

export interface CreateAgentPolicyResponse {
  item: AgentPolicy;
  success: boolean;
}

export type UpdateAgentPolicyRequest = GetOneAgentPolicyRequest & {
  body: NewAgentPolicy;
};

export interface UpdateAgentPolicyResponse {
  item: AgentPolicy;
  success: boolean;
}

export interface CopyAgentPolicyRequest {
  body: Pick<AgentPolicy, 'name' | 'description'>;
}

export interface CopyAgentPolicyResponse {
  item: AgentPolicy;
  success: boolean;
}

export interface DeleteAgentPolicyRequest {
  body: {
    agentPolicyId: string;
  };
}

export interface DeleteAgentPolicyResponse {
  id: string;
  success: boolean;
}

export interface GetFullAgentPolicyRequest {
  params: {
    agentPolicyId: string;
  };
}

export interface GetFullAgentPolicyResponse {
  item: FullAgentPolicy;
  success: boolean;
}
