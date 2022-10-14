/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleActionArray } from '@kbn/securitysolution-io-ts-alerting-types';

import type {
  CustomRule,
  ThreatIndicatorRule,
  MachineLearningRule,
  ThresholdRule,
  NewTermsRule,
  SavedQueryRule,
} from '../../objects/rule';

export const createMachineLearningRule = (rule: MachineLearningRule, ruleId = 'ml_rule_testing') =>
  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: parseInt(rule.riskScore, 10),
      description: rule.description,
      interval: rule.interval,
      name: rule.name,
      severity: rule.severity.toLocaleLowerCase(),
      type: 'machine_learning',
      from: 'now-50000h',
      enabled: false,
      machine_learning_job_id: rule.machineLearningJobs,
      anomaly_threshold: rule.anomalyScoreThreshold,
      tags: rule.tags,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });

export const createCustomRule = (
  rule: CustomRule,
  ruleId = 'rule_testing',
  interval = '100m'
): Cypress.Chainable<Cypress.Response<unknown>> => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLocaleLowerCase() : undefined;
  const timeline = rule.timeline != null ? rule.timeline : undefined;

  return cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: riskScore,
      description: rule.description,
      interval,
      name: rule.name,
      severity,
      type: 'query',
      from: 'now-50000h',
      index: rule.dataSource.type === 'indexPatterns' ? rule.dataSource.index : undefined,
      data_view_id: rule.dataSource.type === 'dataView' ? rule.dataSource.dataView : undefined,
      query: rule.customQuery,
      language: 'kuery',
      enabled: false,
      exceptions_list: rule.exceptionLists ?? [],
      tags: rule.tags,
      ...(timeline?.id ?? timeline?.templateTimelineId
        ? {
            timeline_id: timeline.id ?? timeline.templateTimelineId,
            timeline_title: timeline.title,
          }
        : {}),
      actions: rule.actions,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const createEventCorrelationRule = (rule: CustomRule, ruleId = 'rule_testing') => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLowerCase() : undefined;

  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: riskScore,
      description: rule.description,
      interval: `${rule.runsEvery?.interval}${rule.runsEvery?.type}`,
      from: `now-${rule.lookBack?.interval}${rule.lookBack?.type}`,
      name: rule.name,
      severity,
      type: 'eql',
      index: rule.dataSource.type === 'indexPatterns' ? rule.dataSource.index : undefined,
      data_view_id: rule.dataSource.type === 'dataView' ? rule.dataSource.dataView : undefined,
      query: rule.customQuery,
      language: 'eql',
      enabled: true,
      tags: rule.tags,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};

export const createThresholdRule = (rule: ThresholdRule, ruleId = 'rule_testing') => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLocaleLowerCase() : undefined;

  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: riskScore,
      description: rule.description,
      interval: `${rule.runsEvery?.interval}${rule.runsEvery?.type}`,
      from: `now-${rule.lookBack?.interval}${rule.lookBack?.type}`,
      name: rule.name,
      severity,
      type: 'threshold',
      index: rule.dataSource.type === 'indexPatterns' ? rule.dataSource.index : undefined,
      data_view_id: rule.dataSource.type === 'dataView' ? rule.dataSource.dataView : undefined,
      query: rule.customQuery,
      threshold: {
        field: [rule.thresholdField],
        value: parseInt(rule.threshold, 10),
        cardinality: [],
      },
      enabled: true,
      tags: rule.tags,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};

export const createNewTermsRule = (rule: NewTermsRule, ruleId = 'rule_testing') => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLocaleLowerCase() : undefined;

  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: riskScore,
      description: rule.description,
      interval: `${rule.runsEvery?.interval}${rule.runsEvery?.type}`,
      from: `now-${rule.lookBack?.interval}${rule.lookBack?.type}`,
      name: rule.name,
      severity,
      type: 'new_terms',
      index: rule.dataSource.type === 'indexPatterns' ? rule.dataSource.index : undefined,
      data_view_id: rule.dataSource.type === 'dataView' ? rule.dataSource.dataView : undefined,
      query: rule.customQuery,
      new_terms_fields: rule.newTermsFields,
      history_window_start: `now-${rule.historyWindowSize.interval}${rule.historyWindowSize.type}`,
      enabled: true,
      tags: rule.tags,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
};

export const createSavedQueryRule = (
  rule: SavedQueryRule,
  ruleId = 'saved_query_rule_testing'
): Cypress.Chainable<Cypress.Response<unknown>> => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLocaleLowerCase() : undefined;
  const timeline = rule.timeline != null ? rule.timeline : undefined;

  return cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: riskScore,
      description: rule.description,
      interval: rule.interval,
      name: rule.name,
      severity,
      type: 'saved_query',
      from: 'now-50000h',
      index: rule.dataSource.type === 'indexPatterns' ? rule.dataSource.index : undefined,
      data_view_id: rule.dataSource.type === 'dataView' ? rule.dataSource.dataView : undefined,
      saved_id: rule.savedId,
      language: 'kuery',
      enabled: false,
      exceptions_list: rule.exceptionLists ?? [],
      tags: rule.tags,
      ...(timeline?.id ?? timeline?.templateTimelineId
        ? {
            timeline_id: timeline.id ?? timeline.templateTimelineId,
            timeline_title: timeline.title,
          }
        : {}),
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const createCustomIndicatorRule = (rule: ThreatIndicatorRule, ruleId = 'rule_testing') => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLocaleLowerCase() : undefined;
  const timeline = rule.timeline != null ? rule.timeline : undefined;

  cy.request({
    method: 'POST',
    url: 'api/detection_engine/rules',
    body: {
      rule_id: ruleId,
      risk_score: riskScore,
      description: rule.description,
      // Default interval is 1m, our tests config overwrite this to 1s
      // See https://github.com/elastic/kibana/pull/125396 for details
      interval: '10s',
      name: rule.name,
      severity,
      type: 'threat_match',
      timeline_id: timeline?.templateTimelineId,
      timeline_title: timeline?.title,
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
      threat_indicator_path: rule.threatIndicatorPath,
      from: 'now-50000h',
      index: rule.dataSource.type === 'indexPatterns' ? rule.dataSource.index : undefined,
      data_view_id: rule.dataSource.type === 'dataView' ? rule.dataSource.dataView : undefined,
      query: rule.customQuery || '*:*',
      language: 'kuery',
      enabled: true,
      tags: rule.tags,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const createCustomRuleEnabled = (
  rule: CustomRule,
  ruleId = '1',
  interval = '100m',
  maxSignals = 500,
  actions?: RuleActionArray
) => {
  const riskScore = rule.riskScore != null ? parseInt(rule.riskScore, 10) : undefined;
  const severity = rule.severity != null ? rule.severity.toLocaleLowerCase() : undefined;

  if (rule.dataSource.type === 'indexPatterns') {
    cy.request({
      method: 'POST',
      url: 'api/detection_engine/rules',
      body: {
        rule_id: ruleId,
        risk_score: riskScore,
        description: rule.description,
        interval,
        name: rule.name,
        severity,
        type: 'query',
        from: 'now-50000h',
        index: rule.dataSource.index,
        query: rule.customQuery,
        language: 'kuery',
        enabled: true,
        exceptions_list: rule.exceptionLists ?? [],
        tags: ['rule1'],
        max_signals: maxSignals,
        building_block_type: rule.buildingBlockType,
        actions,
      },
      headers: { 'kbn-xsrf': 'cypress-creds' },
      failOnStatusCode: false,
    });
  } else if (rule.dataSource.type === 'dataView') {
    cy.request({
      method: 'POST',
      url: 'api/detection_engine/rules',
      body: {
        rule_id: ruleId,
        risk_score: riskScore,
        description: rule.description,
        interval,
        name: rule.name,
        severity,
        type: 'query',
        from: 'now-50000h',
        index: [],
        data_view_id: rule.dataSource.dataView,
        query: rule.customQuery,
        language: 'kuery',
        enabled: true,
        exceptions_list: rule.exceptionLists ?? [],
        tags: ['rule1'],
        max_signals: maxSignals,
        building_block_type: rule.buildingBlockType,
        actions,
      },
      headers: { 'kbn-xsrf': 'cypress-creds' },
      failOnStatusCode: false,
    });
  }
};

export const deleteCustomRule = (ruleId = '1') => {
  cy.request({
    method: 'DELETE',
    url: `api/detection_engine/rules?rule_id=${ruleId}`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const importRule = (ndjsonPath: string) => {
  cy.fixture(ndjsonPath)
    .then((file) => Cypress.Blob.binaryStringToBlob(file))
    .then((blob) => {
      const formdata = new FormData();
      formdata.append('file', blob, ndjsonPath);

      cy.request({
        url: 'api/detection_engine/rules/_import',
        method: 'POST',
        headers: {
          'kbn-xsrf': 'cypress-creds',
          'content-type': 'multipart/form-data',
        },
        body: formdata,
      })
        .its('status')
        .should('be.equal', 200);
    });
};
