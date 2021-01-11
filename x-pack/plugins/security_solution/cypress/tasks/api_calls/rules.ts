/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomRule } from '../../objects/rule';

export const createCustomRule = (rule: CustomRule, ruleId = 'rule_testing') =>
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

export const createCustomRuleActivated = (rule: CustomRule, ruleId = 'rule_testing') =>
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
      type: 'query',
      from: 'now-17520h',
      index: ['auditbeat-*'],
      query: rule.customQuery,
      language: 'kuery',
      enabled: true,
      tags: ['rule1'],
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const deleteCustomRule = (ruleId = 'rule_testing') => {
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
