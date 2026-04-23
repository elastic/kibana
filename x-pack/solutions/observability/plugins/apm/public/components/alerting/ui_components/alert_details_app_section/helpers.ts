/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { asPercent } from '@kbn/observability-plugin/common';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import {
  ANOMALY_ALERT_SEVERITY_TYPES,
  getApmMlDetectorLabel,
} from '../../../../../common/rules/apm_rule_types';

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isLatencyThresholdRuleType = (ruleTypeId: string) =>
  ruleTypeId === ApmRuleType.TransactionDuration;

export const isFailedTransactionRateRuleType = (ruleTypeId: string) =>
  ruleTypeId === ApmRuleType.TransactionErrorRate;

export const isAnomalyRuleType = (ruleTypeId: string) => ruleTypeId === ApmRuleType.Anomaly;

export const yLabelFormat = (y?: number | null) => {
  return asPercent(y || 0, 1);
};

export function formatAnomalySeverityValue(alertSeverity: string, detectorType?: string): string {
  const detectorLabel = detectorType
    ? getApmMlDetectorLabel(detectorType as AnomalyDetectorType)
    : undefined;

  if (detectorLabel) {
    return i18n.translate('xpack.apm.alertDetails.anomalyValueLabel', {
      defaultMessage: '{severity} {detector} anomaly',
      values: {
        severity: capitalize(alertSeverity),
        detector: capitalize(detectorLabel),
      },
    });
  }

  return i18n.translate('xpack.apm.alertDetails.anomalyValueLabelWithoutDetector', {
    defaultMessage: '{severity} anomaly',
    values: {
      severity: capitalize(alertSeverity),
    },
  });
}

export function formatAnomalySeverityThreshold(alertEvaluationThreshold: number): string {
  const severityMatch = ANOMALY_ALERT_SEVERITY_TYPES.find(
    (s) => s.threshold === alertEvaluationThreshold
  );

  return i18n.translate('xpack.apm.alertDetails.anomalySeveritySubtitle', {
    defaultMessage: 'Alert when {severity} or above',
    values: {
      severity: severityMatch?.label ?? alertEvaluationThreshold,
    },
  });
}
