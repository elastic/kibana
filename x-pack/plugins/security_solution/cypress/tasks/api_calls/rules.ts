/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRule, ThreatIndicatorRule } from '../../objects/rule';

export const createCustomRule = (rule: CustomRule, ruleId = 'rule_testing', interval = '100m') =>
  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: parseInt(rule.riskScore, 10),
      description: rule.description,
      interval,
      name: rule.name,
      severity: rule.severity.toLocaleLowerCase(),
      type: 'query',
      from: 'now-17520h',
      index: ['exceptions-*'],
      query: rule.customQuery,
      language: 'kuery',
      enabled: false,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const createCustomIndicatorRule = (rule: ThreatIndicatorRule, ruleId = 'rule_testing') =>
  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: parseInt(rule.riskScore, 10),
      description: rule.description,
      interval: '10s',
      name: rule.name,
      severity: rule.severity.toLocaleLowerCase(),
      type: 'threat_match',
      threat_mapping: [
        {
          entries: [
            {
              field: rule.indicatorMappingField,
              type: 'mapping',
              value: rule.indicatorIndexField,
            },
          ],
        },
      ],
      threat_query: '*:*',
      threat_language: 'kuery',
      threat_filters: [],
      threat_index: rule.indicatorIndexPattern,
      threat_indicator_path: '',
      from: 'now-17520h',
      index: rule.index,
      query: rule.customQuery || '*:*',
      language: 'kuery',
      enabled: true,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const createCustomRuleActivated = (
  rule: CustomRule,
  ruleId = '1',
  interval = '100m',
  maxSignals = 500
) =>
  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: parseInt(rule.riskScore, 10),
      description: rule.description,
      interval,
      name: rule.name,
      severity: rule.severity.toLocaleLowerCase(),
      type: 'query',
      from: 'now-17520h',
      index: ['auditbeat-*'],
      query: rule.customQuery,
      language: 'kuery',
      enabled: true,
      tags: ['rule1'],
      max_signals: maxSignals,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const deleteCustomRule = (ruleId = '1') => {
  cy.request({
    method: 'DELETE',
    url: `api/detection_engine/rules?rule_id=${ruleId}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const removeSignalsIndex = () => {
  cy.request({ url: '/api/detection_engine/index', failOnStatusCode: false }).then((response) => {
    if (response.status === 200) {
      cy.request({
        method: 'DELETE',
        url: `api/detection_engine/index`,
        headers: { 'kbn-xsrf': 'delete-signals' },
      });
    }
  });
};
