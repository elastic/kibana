/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { NewAgentConfigSchema } from '../models';
import { ListWithKuerySchema } from '..';

export const GetAgentConfigsRequestSchema = {
  query: ListWithKuerySchema,
};

export const GetOneAgentConfigRequestSchema = {
  params: schema.object({
    agentConfigId: schema.string(),
  }),
};

export const CreateAgentConfigRequestSchema = {
  body: NewAgentConfigSchema,
};

export const UpdateAgentConfigRequestSchema = {
  ...GetOneAgentConfigRequestSchema,
  body: NewAgentConfigSchema,
};

export const DeleteAgentConfigsRequestSchema = {
  params: schema.object({
    agentConfigIds: schema.arrayOf(schema.string()),
  }),
};
