/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const GetAgentsRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 1 }),
    perPage: schema.number({ defaultValue: 20 }),
    kuery: schema.maybe(schema.string()),
    showInactive: schema.boolean({ defaultValue: false }),
  }),
};

export const GetOneAgentRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
};

export const UpdateAgentRequestSchema = {
  params: schema.object({
    agentId: schema.string(),
  }),
  body: schema.object({
    user_provided_metadata: schema.recordOf(schema.string(), schema.any()),
  }),
};
