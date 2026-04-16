/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import type { ReactElement } from 'react';
import { asPercent } from '@kbn/observability-plugin/common';
import {
  ApmRuleType,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { TopAlert } from '@kbn/observability-plugin/public';
import {
  AlertActiveTimeRangeAnnotation,
  AlertAnnotation,
  AlertThresholdAnnotation,
  AlertThresholdTimeRangeRect,
} from '@kbn/observability-alert-details';
import { useEuiTheme } from '@elastic/eui';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

export const getAggsTypeFromRule = (ruleAggType: string): LatencyAggregationType => {
  if (ruleAggType === '95th') return LatencyAggregationType.p95;
  if (ruleAggType === '99th') return LatencyAggregationType.p99;
  return LatencyAggregationType.avg;
};

export const isLatencyThresholdRuleType = (ruleTypeId: string) =>
  ruleTypeId === ApmRuleType.TransactionDuration;

export const isFailedTransactionRateRuleType = (ruleTypeId: string) =>
  ruleTypeId === ApmRuleType.TransactionErrorRate;

export const yLabelFormat = (y?: number | null) => {
  return asPercent(y || 0, 1);
};

export const useGetChartAlertAnnotations = ({
  alert,
  customAlertEvaluationThreshold,
  isMatchingRuleType,
  dateFormat,
}: {
  alert: TopAlert;
  customAlertEvaluationThreshold?: number;
  isMatchingRuleType: (ruleTypeId: string) => boolean;
  dateFormat: string;
}): ReactElement[] | undefined => {
  const { euiTheme } = useEuiTheme();

  if (!isMatchingRuleType(alert.fields[ALERT_RULE_TYPE_ID]) && !customAlertEvaluationThreshold) {
    return undefined;
  }

  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;
  const alertEvalThreshold =
    customAlertEvaluationThreshold ?? alert.fields[ALERT_EVALUATION_THRESHOLD];

  const thresholdAnnotations = (() => {
    if (alertEvalThreshold == null) return [];

    return [
      <AlertThresholdTimeRangeRect
        key={'alertThresholdRect'}
        id={'alertThresholdRect'}
        threshold={alertEvalThreshold}
        color={euiTheme.colors.danger}
      />,
      <AlertThresholdAnnotation
        id={'alertThresholdAnnotation'}
        key={'alertThresholdAnnotation'}
        color={euiTheme.colors.danger}
        threshold={alertEvalThreshold}
      />,
    ];
  })();

  return [
    <AlertActiveTimeRangeAnnotation
      alertStart={alert.start}
      alertEnd={alertEnd}
      color={euiTheme.colors.danger}
      id={'alertActiveRect'}
      key={'alertActiveRect'}
    />,
    <AlertAnnotation
      key={'alertAnnotationStart'}
      id={'alertAnnotationStart'}
      alertStart={alert.start}
      color={euiTheme.colors.danger}
      dateFormat={dateFormat}
    />,
    ...thresholdAnnotations,
  ];
};
