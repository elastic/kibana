/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
