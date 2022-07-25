/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';
import { cspRuleMetadataSchema } from './csp_rule_metadata';

export const cspRuleTemplateSchemaV830 = rt.object({
  audit: rt.string(),
  benchmark: rt.object({ name: rt.string(), version: rt.string() }),
  default_value: rt.maybe(rt.string()),
  description: rt.string(),
  enabled: rt.boolean(),
  id: rt.string(),
  impact: rt.maybe(rt.string()),
  muted: rt.boolean(),
  name: rt.string(),
  profile_applicability: rt.string(),
  rationale: rt.string(),
  references: rt.maybe(rt.string()),
  rego_rule_id: rt.string(),
  remediation: rt.string(),
  section: rt.string(),
  tags: rt.arrayOf(rt.string()),
  version: rt.string(),
});

export const cspRuleTemplateSchemaV840 = rt.object({
  enabled: rt.boolean(),
  metadata: cspRuleMetadataSchema,
  muted: rt.boolean(),
});

export type CspRuleTemplateV830 = TypeOf<typeof cspRuleTemplateSchemaV830>;
export type CspRuleTemplateV840 = TypeOf<typeof cspRuleTemplateSchemaV840>;
export type CspRuleTemplate = CspRuleTemplateV840;
