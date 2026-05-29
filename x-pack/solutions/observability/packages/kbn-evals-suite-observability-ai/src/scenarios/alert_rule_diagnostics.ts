/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WaitForActiveAlertDiagnostics } from '../wait_for_active_alert';
import type { AlertRuleConfig } from './types';

const CUSTOM_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';

function extractServiceNameFromKuery(query: string): string | undefined {
  const match = query.match(/service\.name:\s*"?(?<name>[^"\s]+)"?/);
  return match?.groups?.name ?? match?.[1];
}

export function getAlertRuleDiagnostics(
  scenarioId: string,
  ruleParams: AlertRuleConfig['ruleParams']
): WaitForActiveAlertDiagnostics {
  const { rule_type_id: ruleTypeId } = ruleParams;

  if (ruleTypeId === CUSTOM_THRESHOLD_RULE_TYPE_ID) {
    const criteria = ruleParams.params.criteria[0];
    const query = ruleParams.params.searchConfiguration.query.query;

    return {
      scenarioId,
      ruleTypeId,
      serviceName: extractServiceNameFromKuery(query),
      windowSize: criteria?.timeSize,
      windowUnit: criteria?.timeUnit,
    };
  }

  const apmParams = ruleParams.params;

  return {
    scenarioId,
    ruleTypeId,
    serviceName: 'serviceName' in apmParams ? apmParams.serviceName : undefined,
    windowSize: 'windowSize' in apmParams ? apmParams.windowSize : undefined,
    windowUnit: 'windowUnit' in apmParams ? apmParams.windowUnit : undefined,
  };
}
