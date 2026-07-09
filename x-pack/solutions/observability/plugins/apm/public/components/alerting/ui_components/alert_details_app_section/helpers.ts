/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiCallOutProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asPercent } from '@kbn/observability-plugin/common';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getApmMlDetectorLabel } from '../../../../../common/anomaly_detection';
import { ANOMALY_ALERT_SEVERITY_TYPES } from '../../../../../common/rules/apm_rule_types';

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isAnomalyRuleType = (ruleTypeId: ApmRuleType): ruleTypeId is ApmRuleType.Anomaly =>
  ruleTypeId === ApmRuleType.Anomaly;

export const isErrorCountRuleType = (
  ruleTypeId: ApmRuleType
): ruleTypeId is ApmRuleType.ErrorCount => ruleTypeId === ApmRuleType.ErrorCount;

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

function getThresholdSeverityLabel(alertEvaluationThreshold: number): string {
  const severityMatch = ANOMALY_ALERT_SEVERITY_TYPES.find(
    (s) => s.threshold === alertEvaluationThreshold
  );

  return severityMatch?.type ?? String(alertEvaluationThreshold);
}

export function formatAnomalyCalloutTitle({
  alertSeverity,
  detectorType,
}: {
  alertSeverity: ML_ANOMALY_SEVERITY;
  detectorType: AnomalyDetectorType;
}): string {
  return i18n.translate('xpack.apm.alertDetails.anomalyCalloutTitle', {
    defaultMessage: '{severity} APM anomaly detected - {detectorType}',
    values: {
      severity: formatSeverityLabel(alertSeverity),
      detectorType: getApmMlDetectorLabel(detectorType),
    },
  });
}

export function formatAnomalyCalloutBody(alertEvaluationThreshold: number): string {
  return i18n.translate('xpack.apm.alertDetails.anomalyCalloutBody', {
    defaultMessage:
      'Alert when an anomaly with severity {thresholdSeverity, select, critical {critical} major {major} minor {minor} warning {warning} other {{thresholdSeverity}}} or above is detected.',
    values: {
      thresholdSeverity: getThresholdSeverityLabel(alertEvaluationThreshold),
    },
  });
}

export function getAnomalyCalloutColor(
  alertSeverity: ML_ANOMALY_SEVERITY
): EuiCallOutProps['color'] {
  switch (alertSeverity) {
    case ML_ANOMALY_SEVERITY.CRITICAL:
      return 'danger';
    case ML_ANOMALY_SEVERITY.MAJOR:
    case ML_ANOMALY_SEVERITY.MINOR:
      return 'warning';
    default:
      return 'primary';
  }
}
