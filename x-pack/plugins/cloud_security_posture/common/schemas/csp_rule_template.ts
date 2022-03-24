/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

const cspRuleTemplateSchema = rt.object({
  name: rt.string(),
  description: rt.string(),
  rationale: rt.string(),
  impact: rt.string(),
  default_value: rt.string(),
  remediation: rt.string(),
  benchmark: rt.object({ name: rt.string(), version: rt.string() }),
  severity: rt.string(),
  benchmark_rule_id: rt.string(),
  rego_rule_id: rt.string(),
  tags: rt.arrayOf(rt.string()),
});
export const cloudSecurityPostureRuleTemplateSavedObjectType = 'csp-rule-template';
export type CloudSecurityPostureRuleTemplateSchema = TypeOf<typeof cspRuleTemplateSchema>;
