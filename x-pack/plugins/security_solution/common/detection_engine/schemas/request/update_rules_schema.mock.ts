/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UpdateRulesSchema, UpdateRulesSchemaDecoded } from './update_rules_schema';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';

export const getUpdateRulesSchemaMock = (): UpdateRulesSchema => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: 'rule-1',
});

export const getUpdateRulesSchemaDecodedMock = (): UpdateRulesSchemaDecoded => ({
  author: [],
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  severity_mapping: [],
  type: 'query',
  risk_score: 55,
  risk_score_mapping: [],
  language: 'kuery',
  references: [],
  actions: [],
  enabled: true,
  false_positives: [],
  from: 'now-6m',
  interval: '5m',
  max_signals: DEFAULT_MAX_SIGNALS,
  tags: [],
  to: 'now',
  threat: [],
  throttle: null,
  exceptions_list: [],
  rule_id: 'rule-1',
});
