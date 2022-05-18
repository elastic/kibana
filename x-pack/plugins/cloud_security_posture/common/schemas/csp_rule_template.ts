/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

const cspRuleTemplateSchema = rt.object({
  id: rt.string(),
  name: rt.string(),
  tags: rt.arrayOf(rt.string()),
  description: rt.string(),
  rationale: rt.string(),
  default_value: rt.string(),
  impact: rt.string(),
  remediation: rt.string(),
  benchmark: rt.object({ name: rt.string(), version: rt.string() }),
  rego_rule_id: rt.string(),
  enabled: rt.boolean(),
  muted: rt.boolean(),
});
export const cloudSecurityPostureRuleTemplateSavedObjectType = 'csp-rule-template';
export type CloudSecurityPostureRuleTemplateSchema = TypeOf<typeof cspRuleTemplateSchema>;
