/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { PackagePolicySchema, NamespaceSchema } from './package_policy';
import { agentPolicyStatuses, dataTypes } from '../../../common';

const AgentPolicyBaseSchema = {
  name: schema.string({ minLength: 1 }),
  namespace: NamespaceSchema,
  description: schema.maybe(schema.string()),
  monitoring_enabled: schema.maybe(
    schema.arrayOf(
      schema.oneOf([schema.literal(dataTypes.Logs), schema.literal(dataTypes.Metrics)])
    )
  ),
};

export const NewAgentPolicySchema = schema.object({
  ...AgentPolicyBaseSchema,
});

export const AgentPolicySchema = schema.object({
  ...AgentPolicyBaseSchema,
  id: schema.string(),
  status: schema.oneOf([
    schema.literal(agentPolicyStatuses.Active),
    schema.literal(agentPolicyStatuses.Inactive),
  ]),
  package_policies: schema.oneOf([
    schema.arrayOf(schema.string()),
    schema.arrayOf(PackagePolicySchema),
  ]),
  updated_at: schema.string(),
  updated_by: schema.string(),
});
