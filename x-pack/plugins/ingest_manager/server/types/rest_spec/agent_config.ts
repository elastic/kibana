/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { NewAgentConfigSchema } from '../models';
import { ListWithKuerySchema } from './index';

export const GetAgentConfigsRequestSchema = {
  query: ListWithKuerySchema.extends({
    full: schema.maybe(schema.boolean()),
  }),
};

export const GetOneAgentConfigRequestSchema = {
  params: schema.object({
    agentConfigId: schema.string(),
  }),
};

export const CreateAgentConfigRequestSchema = {
  body: NewAgentConfigSchema,
  query: schema.object({
    sys_monitoring: schema.maybe(schema.boolean()),
  }),
};

export const UpdateAgentConfigRequestSchema = {
  ...GetOneAgentConfigRequestSchema,
  body: NewAgentConfigSchema,
};

export const CopyAgentConfigRequestSchema = {
  ...GetOneAgentConfigRequestSchema,
  body: schema.object({
    name: schema.string({ minLength: 1 }),
    description: schema.maybe(schema.string()),
  }),
};

export const DeleteAgentConfigRequestSchema = {
  body: schema.object({
    agentConfigId: schema.string(),
  }),
};

export const GetFullAgentConfigRequestSchema = {
  params: schema.object({
    agentConfigId: schema.string(),
  }),
  query: schema.object({
    download: schema.maybe(schema.boolean()),
    standalone: schema.maybe(schema.boolean()),
  }),
};
