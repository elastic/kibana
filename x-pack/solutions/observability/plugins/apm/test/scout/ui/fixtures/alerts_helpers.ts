/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltWorkerFixtures } from '@kbn/scout-oblt';
import { faker } from '@faker-js/faker';
import { APM_ALERTS_INDEX_PATTERN } from './constants';

const SERVICE_NAME = 'opbeans-java';
const TRANSACTION_TYPE = 'request';
const ENVIRONMENT = 'production';

interface ApmAlertDocumentParams {
  alertUuid: string;
  ruleId: string;
  ruleName: string;
  ruleTypeId: string;
  ruleCategory: string;
  reason: string;
  evaluationThreshold: number;
  evaluationValue: number;
  serviceName: string;
  environment: string;
  processorEvent: string;
  transactionType?: string;
}

export interface AlertTestConfig {
  ruleTypeId: string;
  ruleNamePrefix: string;
  ruleParams: Record<string, unknown>;
  ruleCategory: string;
  reason: string;
  evaluationThreshold: number;
  evaluationValue: number;
  primaryChartTitle: string;
  secondaryChartTitles: [string, string];
}

export const LATENCY_THRESHOLD_CONFIG: AlertTestConfig = {
  ruleTypeId: 'apm.transaction_duration',
  ruleNamePrefix: 'Latency threshold',
  ruleParams: {
    serviceName: SERVICE_NAME,
    transactionType: TRANSACTION_TYPE,
    environment: ENVIRONMENT,
    aggregationType: 'avg',
    threshold: 1500,
    windowSize: 5,
    windowUnit: 'm',
  },
  ruleCategory: 'Latency threshold',
  reason: `Avg. latency is 2,000 ms in the last 5 mins for service: ${SERVICE_NAME}, env: ${ENVIRONMENT}, type: ${TRANSACTION_TYPE}. Alert when > 1,500 ms.`,
  evaluationThreshold: 1500000,
  evaluationValue: 2000000,
  primaryChartTitle: 'Latency',
  secondaryChartTitles: ['Throughput', 'Failed transaction rate'],
};

export const FAILED_TRANSACTION_RATE_CONFIG: AlertTestConfig = {
  ruleTypeId: 'apm.transaction_error_rate',
  ruleNamePrefix: 'Failed transaction rate threshold',
  ruleParams: {
    serviceName: SERVICE_NAME,
    transactionType: TRANSACTION_TYPE,
    environment: ENVIRONMENT,
    threshold: 30,
    windowSize: 5,
    windowUnit: 'm',
  },
  ruleCategory: 'Failed transaction rate threshold',
  reason: `Failed transaction rate is 45% in the last 5 mins for service: ${SERVICE_NAME}, env: ${ENVIRONMENT}, type: ${TRANSACTION_TYPE}. Alert when > 30%.`,
  evaluationThreshold: 30,
  evaluationValue: 45,
  primaryChartTitle: 'Failed transaction rate',
  secondaryChartTitles: ['Throughput', 'Latency'],
};

export function createApmAlertDocument({
  alertUuid,
  ruleId,
  ruleName,
  ruleTypeId,
  ruleCategory,
  reason,
  evaluationThreshold,
  evaluationValue,
  serviceName,
  environment,
  processorEvent,
  transactionType,
}: ApmAlertDocumentParams) {
  const now = new Date().toISOString();

  return {
    '@timestamp': now,
    'kibana.alert.uuid': alertUuid,
    'kibana.alert.start': now,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.rule.name': ruleName,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.rule_type_id': ruleTypeId,
    'kibana.alert.rule.category': ruleCategory,
    'kibana.alert.rule.consumer': 'apm',
    'kibana.alert.reason': reason,
    'kibana.alert.evaluation.threshold': evaluationThreshold,
    'kibana.alert.evaluation.value': evaluationValue,
    'kibana.alert.duration.us': 0,
    'kibana.alert.time_range': { gte: now },
    'kibana.alert.instance.id': '*',
    'service.name': serviceName,
    'service.environment': environment,
    ...(transactionType && { 'transaction.type': transactionType }),
    'processor.event': processorEvent,
    'kibana.space_ids': ['default'],
    'event.kind': 'signal',
    'event.action': 'open',
    tags: ['apm'],
  };
}

export async function cleanupApmAlerts({
  apiServices,
  esClient,
  ruleName,
}: Pick<ObltWorkerFixtures, 'apiServices' | 'esClient'> & { ruleName: string }) {
  const findResponse = await apiServices.alerting.rules.find({
    search: ruleName,
    search_fields: ['name'],
    per_page: 1,
  });
  const rules = findResponse.data.data;

  for (const rule of rules) {
    const ruleId = rule.id;

    try {
      await esClient.deleteByQuery({
        index: APM_ALERTS_INDEX_PATTERN,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        refresh: true,
        conflicts: 'proceed',
      });
    } catch {
      // Continue cleanup even if alert deletion fails
    }

    try {
      await apiServices.alerting.rules.delete(ruleId);
    } catch {
      // Continue cleanup even if rule deletion fails
    }
  }
}

export async function setupAlertForTest({
  apiServices,
  esClient,
  alertIndex,
  config,
}: Pick<ObltWorkerFixtures, 'apiServices' | 'esClient'> & {
  alertIndex: string;
  config: AlertTestConfig;
}) {
  const ruleName = `${config.ruleNamePrefix} ${faker.string.uuid()} ${Date.now()}`;
  const alertUuid = faker.string.uuid();

  const ruleResponse = await apiServices.alerting.rules.create({
    ruleTypeId: config.ruleTypeId,
    name: ruleName,
    consumer: 'apm',
    schedule: { interval: '1m' },
    enabled: false,
    params: config.ruleParams,
    tags: ['apm'],
  });

  const indexResponse = await esClient.index({
    index: alertIndex,
    op_type: 'create',
    refresh: 'wait_for',
    document: createApmAlertDocument({
      alertUuid,
      ruleId: ruleResponse.data.id,
      ruleName,
      ruleTypeId: config.ruleTypeId,
      ruleCategory: config.ruleCategory,
      reason: config.reason,
      evaluationThreshold: config.evaluationThreshold,
      evaluationValue: config.evaluationValue,
      serviceName: SERVICE_NAME,
      environment: ENVIRONMENT,
      processorEvent: 'transaction',
      transactionType: TRANSACTION_TYPE,
    }),
  });

  return { ruleName, alertDocId: indexResponse._id };
}
