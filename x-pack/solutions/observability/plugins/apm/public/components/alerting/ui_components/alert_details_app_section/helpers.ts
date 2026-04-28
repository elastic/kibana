/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { asPercent } from '@kbn/observability-plugin/common';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { ANOMALY_ALERT_SEVERITY_TYPES } from '../../../../../common/rules/apm_rule_types';

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isAnomalyRuleType = (ruleTypeId: ApmRuleType): boolean =>
  ruleTypeId === ApmRuleType.Anomaly;

export const yLabelFormat = (y?: number | null) => {
  return asPercent(y || 0, 1);
};

export function formatSeverityLabel(alertSeverity: ML_ANOMALY_SEVERITY): string {
  return i18n.translate('xpack.apm.alertDetails.severityLabel', {
    defaultMessage: `{severity, select,
      critical {Critical}
      major {Major}
      minor {Minor}
      warning {Warning}
      low {Low}
      other {{severity}}
    }`,
    values: { severity: alertSeverity },
  });
}

export function formatAnomalySeverityThreshold(alertEvaluationThreshold: number): string {
  const severityMatch = ANOMALY_ALERT_SEVERITY_TYPES.find(
    (s) => s.threshold === alertEvaluationThreshold
  );

  return i18n.translate('xpack.apm.alertDetails.anomalySeveritySubtitle', {
    defaultMessage: `{severity, select,
      critical {Alert when critical or above}
      major {Alert when major or above}
      minor {Alert when minor or above}
      warning {Alert when warning or above}
      other {Alert when {severity} or above}
    }`,
    values: {
      severity: severityMatch?.label ?? String(alertEvaluationThreshold),
    },
  });
}
