/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltWorkerFixtures } from '@kbn/scout-oblt';
import { APM_ALERTS_INDEX_PATTERN } from './constants';

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
