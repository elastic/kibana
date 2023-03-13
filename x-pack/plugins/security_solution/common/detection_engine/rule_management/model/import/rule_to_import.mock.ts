/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleToImport } from './rule_to_import';

export const getImportRulesSchemaMock = (ruleId = 'rule-1'): RuleToImport => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getImportRulesWithIdSchemaMock = (ruleId = 'rule-1'): RuleToImport => ({
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

/**
 * Given an array of rules, builds an NDJSON string of rules
 * as we might import/export
 * @param rules Array of rule objects with which to generate rule JSON
 */
export const rulesToNdJsonString = (rules: RuleToImport[]) => {
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

export const getImportThreatMatchRulesSchemaMock = (ruleId = 'rule-1'): RuleToImport => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
  threat_index: ['index-123'],
  threat_mapping: [{ entries: [{ field: 'host.name', type: 'mapping', value: 'host.name' }] }],
  threat_query: '*:*',
  threat_filters: [
    {
      bool: {
        must: [
          {
            query_string: {
              query: 'host.name: linux',
              analyze_wildcard: true,
              time_zone: 'Zulu',
            },
          },
        ],
        filter: [],
        should: [],
        must_not: [],
      },
    },
  ],
});

export const webHookConnector = {
  id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
  type: 'action',
  updated_at: '2023-01-25T14:35:52.852Z',
  created_at: '2023-01-25T14:35:52.852Z',
  version: 'WzUxNTksMV0=',
  attributes: {
    actionTypeId: '.webhook',
    name: 'webhook',
    isMissingSecrets: false,
    config: {},
    secrets: {},
  },
  references: [],
  migrationVersion: { action: '8.3.0' },
  coreMigrationVersion: '8.7.0',
};

export const ruleWithConnectorNdJSON = (): string => {
  const items = [
    {
      ...getImportRulesSchemaMock(),
      actions: [
        {
          group: 'default',
          id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
          action_type_id: '.webhook',
          params: {},
        },
      ],
    },
    webHookConnector,
  ];
  const stringOfExceptions = items.map((item) => JSON.stringify(item));

  return stringOfExceptions.join('\n');
};
