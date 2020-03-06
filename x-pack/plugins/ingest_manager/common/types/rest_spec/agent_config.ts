/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AgentConfig, NewAgentConfigSchema } from '../models';
import { ListWithKuerySchema } from './common';

export interface GetAgentConfigsRequestSchema {
  query: ListWithKuerySchema;
}

export interface GetAgentConfigsResponse {
  items: AgentConfig[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOneAgentConfigRequestSchema {
  params: {
    agentConfigId: string;
  };
}

export interface GetOneAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export interface CreateAgentConfigRequestSchema {
  body: NewAgentConfigSchema;
}

export interface CreateAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export type UpdateAgentConfigRequestSchema = GetOneAgentConfigRequestSchema & {
  body: NewAgentConfigSchema;
};

export interface UpdateAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export interface DeleteAgentConfigsRequestSchema {
  body: {
    agentConfigIds: string[];
  };
}

export type DeleteAgentConfigsResponse = Array<{
  id: string;
  success: boolean;
}>;
