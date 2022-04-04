/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

export const cspRuleAssetSavedObjectType = 'csp_rule';

// TODO: needs to be shared with kubebeat
export const cspRuleSchema = rt.object({
  id: rt.string(),
  name: rt.string(),
  description: rt.string(),
  rationale: rt.string(),
  impact: rt.string(),
  default_value: rt.string(),
  remediation: rt.string(),
  benchmark: rt.object({ name: rt.string(), version: rt.string() }),
  tags: rt.arrayOf(rt.string()),
  enabled: rt.boolean(),
  muted: rt.boolean(),
});

export type CspRuleSchema = TypeOf<typeof cspRuleSchema>;
