/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PatchRulesSchema, PatchRulesSchemaDecoded } from './patch_rules_schema';

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

export const getPatchRulesSchemaDecodedMock = (): PatchRulesSchemaDecoded =>
  getPatchRulesSchemaMock();
