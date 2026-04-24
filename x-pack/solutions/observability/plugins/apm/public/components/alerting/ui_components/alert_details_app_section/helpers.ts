/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { asPercent } from '@kbn/observability-plugin/common';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import { ANOMALY_ALERT_SEVERITY_TYPES } from '../../../../../common/rules/apm_rule_types';

const ANOMALY_DETECTOR_VALUE_LABELS: Record<
  ML_ANOMALY_SEVERITY,
  Record<AnomalyDetectorType, string>
> = {
  [ML_ANOMALY_SEVERITY.CRITICAL]: {
    [AnomalyDetectorType.txLatency]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.critical.latency',
      { defaultMessage: 'Critical latency anomaly' }
    ),
    [AnomalyDetectorType.txThroughput]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.critical.throughput',
      { defaultMessage: 'Critical throughput anomaly' }
    ),
    [AnomalyDetectorType.txFailureRate]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.critical.failureRate',
      { defaultMessage: 'Critical failure rate anomaly' }
    ),
  },
  [ML_ANOMALY_SEVERITY.MAJOR]: {
    [AnomalyDetectorType.txLatency]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.major.latency',
      { defaultMessage: 'Major latency anomaly' }
    ),
    [AnomalyDetectorType.txThroughput]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.major.throughput',
      { defaultMessage: 'Major throughput anomaly' }
    ),
    [AnomalyDetectorType.txFailureRate]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.major.failureRate',
      { defaultMessage: 'Major failure rate anomaly' }
    ),
  },
  [ML_ANOMALY_SEVERITY.MINOR]: {
    [AnomalyDetectorType.txLatency]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.minor.latency',
      { defaultMessage: 'Minor latency anomaly' }
    ),
    [AnomalyDetectorType.txThroughput]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.minor.throughput',
      { defaultMessage: 'Minor throughput anomaly' }
    ),
    [AnomalyDetectorType.txFailureRate]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.minor.failureRate',
      { defaultMessage: 'Minor failure rate anomaly' }
    ),
  },
  [ML_ANOMALY_SEVERITY.WARNING]: {
    [AnomalyDetectorType.txLatency]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.warning.latency',
      { defaultMessage: 'Warning latency anomaly' }
    ),
    [AnomalyDetectorType.txThroughput]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.warning.throughput',
      { defaultMessage: 'Warning throughput anomaly' }
    ),
    [AnomalyDetectorType.txFailureRate]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.warning.failureRate',
      { defaultMessage: 'Warning failure rate anomaly' }
    ),
  },
  [ML_ANOMALY_SEVERITY.LOW]: {
    [AnomalyDetectorType.txLatency]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.low.latency',
      { defaultMessage: 'Low latency anomaly' }
    ),
    [AnomalyDetectorType.txThroughput]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.low.throughput',
      { defaultMessage: 'Low throughput anomaly' }
    ),
    [AnomalyDetectorType.txFailureRate]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.low.failureRate',
      { defaultMessage: 'Low failure rate anomaly' }
    ),
  },
  [ML_ANOMALY_SEVERITY.UNKNOWN]: {
    [AnomalyDetectorType.txLatency]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.unknown.latency',
      { defaultMessage: 'Unknown latency anomaly' }
    ),
    [AnomalyDetectorType.txThroughput]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.unknown.throughput',
      { defaultMessage: 'Unknown throughput anomaly' }
    ),
    [AnomalyDetectorType.txFailureRate]: i18n.translate(
      'xpack.apm.alertDetails.anomalyValueLabel.unknown.failureRate',
      { defaultMessage: 'Unknown failure rate anomaly' }
    ),
  },
};

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isLatencyThresholdRuleType = (ruleTypeId: ApmRuleType) =>
  ruleTypeId === ApmRuleType.TransactionDuration;

export const isFailedTransactionRateRuleType = (ruleTypeId: ApmRuleType) =>
  ruleTypeId === ApmRuleType.TransactionErrorRate;

export const isAnomalyRuleType = (ruleTypeId: ApmRuleType) => ruleTypeId === ApmRuleType.Anomaly;

export const yLabelFormat = (y?: number | null) => {
  return asPercent(y || 0, 1);
};

export function formatAnomalySeverityValue(
  alertSeverity: ML_ANOMALY_SEVERITY,
  detectorType?: AnomalyDetectorType
): string {
  if (!detectorType) {
    return i18n.translate('xpack.apm.alertDetails.anomalyValueLabelWithoutDetector', {
      defaultMessage: `{severity, select,
      critical {Critical anomaly}
      major {Major anomaly}
      minor {Minor anomaly}
      warning {Warning anomaly}
      other {{severity} anomaly}
    }`,
      values: { severity: alertSeverity },
    });
  }

  return (
    ANOMALY_DETECTOR_VALUE_LABELS[alertSeverity]?.[detectorType] ??
    `${alertSeverity} ${detectorType} anomaly`
  );
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
