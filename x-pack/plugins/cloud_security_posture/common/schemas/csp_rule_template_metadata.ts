/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

export const cspRuleTemplateMetadataSchemaV840 = rt.object({
  audit: rt.string(),
  benchmark: rt.object({
    name: rt.string(),
    id: rt.string(),
    version: rt.string(),
  }),
  default_value: rt.maybe(rt.string()),
  description: rt.string(),
  id: rt.string(),
  impact: rt.maybe(rt.string()),
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

export const cspRuleTemplateMetadataSchemaV870 = rt.object({
  audit: rt.string(),
  benchmark: rt.object({
    name: rt.string(),
    id: rt.string(),
    version: rt.string(),
    rule_number: rt.maybe(rt.string()),
  }),
  default_value: rt.maybe(rt.string()),
  description: rt.string(),
  id: rt.string(),
  impact: rt.maybe(rt.string()),
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

export type CspRuleMetadataV840 = TypeOf<typeof cspRuleTemplateMetadataSchemaV840>;
export type CspRuleMetadataV870 = TypeOf<typeof cspRuleTemplateMetadataSchemaV870>;
export type CspRuleTemplateMetadata = CspRuleMetadataV870;
