/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AgentConfig, NewAgentConfig, FullAgentConfig } from '../models';
import { ListWithKuery } from './common';

export interface GetAgentConfigsRequest {
  query: ListWithKuery;
}

export interface GetAgentConfigsResponse {
  items: Array<AgentConfig & { agents?: number }>;
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOneAgentConfigRequest {
  params: {
    agentConfigId: string;
  };
}

export interface GetOneAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export interface CreateAgentConfigRequest {
  body: NewAgentConfig;
}

export interface CreateAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export type UpdateAgentConfigRequest = GetOneAgentConfigRequest & {
  body: NewAgentConfig;
};

export interface UpdateAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export interface DeleteAgentConfigsRequest {
  body: {
    agentConfigIds: string[];
  };
}

export type DeleteAgentConfigsResponse = Array<{
  id: string;
  success: boolean;
}>;

export interface GetFullAgentConfigRequest {
  params: {
    agentConfigId: string;
  };
}

export interface GetFullAgentConfigResponse {
  item: FullAgentConfig;
  success: boolean;
}
