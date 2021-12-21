/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const GetPolicyResponseSchema = {
  query: schema.object({
    agentId: schema.string(),
  }),
};

export const GetAgentPolicySummaryRequestSchema = {
  query: schema.object({
    package_name: schema.string(),
    policy_id: schema.nullable(schema.string()),
  }),
};

const ListWithKuerySchema = schema.object(
  {
    page: schema.number({ defaultValue: 1, min: 1 }),
    pageSize: schema.number({ defaultValue: 20, min: 1 }),
    sort: schema.maybe(schema.string()),
    sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
    showUpgradeable: schema.maybe(schema.boolean()),
    kuery: schema.maybe(
      schema.oneOf([
        schema.string(),
        schema.any(), // KueryNode
      ])
    ),
  },
  { defaultValue: { page: 1, pageSize: 20 } }
);

export const GetEndpointPackagePolicyRequestSchema = {
  query: ListWithKuerySchema,
};
