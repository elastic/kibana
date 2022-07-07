/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PatchRulesSchema, ThresholdPatchSchema } from './patch_rules_schema';

export const getPatchRulesSchemaMock = (): PatchRulesSchema => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: 'rule-1',
});

export const getPatchThresholdRulesSchemaMock = (): ThresholdPatchSchema => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threshold',
  risk_score: 55,
  language: 'kuery',
  rule_id: 'rule-1',
  threshold: {
    field: 'host.name',
    value: 10,
  },
});
