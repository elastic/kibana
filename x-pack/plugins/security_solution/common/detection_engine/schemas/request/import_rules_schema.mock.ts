/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImportRulesSchema, ImportRulesSchemaDecoded } from './import_rules_schema';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';

export const getImportRulesSchemaMock = (ruleId = 'rule-1'): ImportRulesSchema => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getImportRulesWithIdSchemaMock = (ruleId = 'rule-1'): ImportRulesSchema => ({
  id: '6afb8ce1-ea94-4790-8653-fd0b021d2113',
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getImportRulesSchemaDecodedMock = (): ImportRulesSchemaDecoded => ({
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
  version: 1,
  exceptions_list: [],
  rule_id: 'rule-1',
  immutable: false,
});

/**
 * Given an array of rules, builds an NDJSON string of rules
 * as we might import/export
 * @param rules Array of rule objects with which to generate rule JSON
 */
export const rulesToNdJsonString = (rules: ImportRulesSchema[]) => {
  return rules.map((rule) => JSON.stringify(rule)).join('\r\n');
};

/**
 * Given an array of rule IDs, builds an NDJSON string of rules
 * as we might import
 * @param ruleIds Array of ruleIds with which to generate rule JSON
 */
export const ruleIdsToNdJsonString = (ruleIds: string[]) => {
  const rules = ruleIds.map((ruleId) => getImportRulesSchemaMock(ruleId));
  return rulesToNdJsonString(rules);
};
