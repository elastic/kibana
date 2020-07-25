/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AgentConfig, NewAgentConfig, FullAgentConfig } from '../models';
import { ListWithKuery } from './common';

export interface GetAgentConfigsRequest {
  query: ListWithKuery & {
    full?: boolean;
  };
}

export type GetAgentConfigsResponseItem = AgentConfig & { agents?: number };

export interface GetAgentConfigsResponse {
  items: GetAgentConfigsResponseItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface GetOneAgentConfigRequest {
  params: {
    agentConfigId: string;
  };
}

export interface GetOneAgentConfigResponse {
  item: AgentConfig;
}

export interface CreateAgentConfigRequest {
  body: NewAgentConfig;
}

export interface CreateAgentConfigResponse {
  item: AgentConfig;
}

export type UpdateAgentConfigRequest = GetOneAgentConfigRequest & {
  body: NewAgentConfig;
};

export interface UpdateAgentConfigResponse {
  item: AgentConfig;
}

export interface CopyAgentConfigRequest {
  body: Pick<AgentConfig, 'name' | 'description'>;
}

export interface CopyAgentConfigResponse {
  item: AgentConfig;
}

export interface DeleteAgentConfigRequest {
  body: {
    agentConfigId: string;
  };
}

export interface DeleteAgentConfigResponse {
  id: string;
}

export interface GetFullAgentConfigRequest {
  params: {
    agentConfigId: string;
  };
}

export interface GetFullAgentConfigResponse {
  item: FullAgentConfig;
}
