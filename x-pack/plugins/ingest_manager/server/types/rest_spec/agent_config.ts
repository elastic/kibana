/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { AgentConfig, NewAgentConfigSchema } from '../models';
import { ListWithKuerySchema } from './common';

export const GetAgentConfigsRequestSchema = {
  query: ListWithKuerySchema,
};

export interface GetAgentConfigsResponse {
  items: AgentConfig[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export const GetOneAgentConfigRequestSchema = {
  params: schema.object({
    agentConfigId: schema.string(),
  }),
};

export interface GetOneAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export const CreateAgentConfigRequestSchema = {
  body: NewAgentConfigSchema,
};

export interface CreateAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export const UpdateAgentConfigRequestSchema = {
  ...GetOneAgentConfigRequestSchema,
  body: NewAgentConfigSchema,
};

export interface UpdateAgentConfigResponse {
  item: AgentConfig;
  success: boolean;
}

export const DeleteAgentConfigsRequestSchema = {
  body: schema.object({
    agentConfigIds: schema.arrayOf(schema.string()),
  }),
};

export type DeleteAgentConfigsResponse = Array<{
  id: string;
  success: boolean;
}>;
