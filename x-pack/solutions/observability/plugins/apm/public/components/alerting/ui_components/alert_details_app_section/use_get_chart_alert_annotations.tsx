/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import type { ReactElement } from 'react';
import { ALERT_END, ALERT_EVALUATION_THRESHOLD, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { TopAlert } from '@kbn/observability-plugin/public';
import {
  AlertActiveTimeRangeAnnotation,
  AlertAnnotation,
  AlertThresholdAnnotation,
  AlertThresholdTimeRangeRect,
} from '@kbn/observability-alert-details';
import { useEuiTheme } from '@elastic/eui';

interface UseGetChartAlertAnnotationsProps {
  alert: TopAlert;
  dateFormat: string;
  customAlertEvaluationThreshold?: number;
  isMatchingRuleType: (ruleTypeId: string) => boolean;
  normalizeThreshold?: (value: number) => number;
}

export const useGetChartAlertAnnotations = ({
  alert,
  dateFormat,
  customAlertEvaluationThreshold,
  isMatchingRuleType,
  normalizeThreshold,
}: UseGetChartAlertAnnotationsProps): ReactElement[] | undefined => {
  const { euiTheme } = useEuiTheme();

  if (
    !isMatchingRuleType(alert.fields[ALERT_RULE_TYPE_ID]) &&
    customAlertEvaluationThreshold == null
  ) {
    return undefined;
  }

  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;

  const thresholdAnnotations = (() => {
    const alertEvalThreshold =
      customAlertEvaluationThreshold ?? alert.fields[ALERT_EVALUATION_THRESHOLD];

    if (alertEvalThreshold == null) return [];

    const normalizedThreshold = normalizeThreshold
      ? normalizeThreshold(alertEvalThreshold)
      : alertEvalThreshold;

    return [
      <AlertThresholdTimeRangeRect
        key={'alertThresholdRect'}
        id={'alertThresholdRect'}
        threshold={normalizedThreshold}
        color={euiTheme.colors.danger}
      />,
      <AlertThresholdAnnotation
        id={'alertThresholdAnnotation'}
        key={'alertThresholdAnnotation'}
        color={euiTheme.colors.danger}
        threshold={normalizedThreshold}
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
