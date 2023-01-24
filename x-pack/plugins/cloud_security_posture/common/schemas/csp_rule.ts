/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';
import { cspRuleMetadataSchemaV840 } from './csp_rule_metadata';

export const cspRuleSchemaV830 = rt.object({
  audit: rt.string(),
  benchmark: rt.object({ name: rt.string(), version: rt.string() }),
  default_value: rt.nullable(rt.string()),
  description: rt.string(),
  enabled: rt.boolean(),
  id: rt.string(),
  impact: rt.nullable(rt.string()),
  muted: rt.boolean(),
  name: rt.string(),
  package_policy_id: rt.string(),
  policy_id: rt.string(),
  profile_applicability: rt.string(),
  rationale: rt.string(),
  references: rt.nullable(rt.string()),
  rego_rule_id: rt.string(),
  remediation: rt.string(),
  section: rt.string(),
  tags: rt.arrayOf(rt.string()),
  version: rt.string(),
});

export const cspRuleSchemaV840 = rt.object({
  enabled: rt.boolean(),
  metadata: cspRuleMetadataSchemaV840,
  muted: rt.boolean(),
  package_policy_id: rt.string(),
  policy_id: rt.string(),
});

export type CspRuleV830 = TypeOf<typeof cspRuleSchemaV830>;
export type CspRuleV840 = TypeOf<typeof cspRuleSchemaV840>;
export type CspRule = CspRuleV840;
