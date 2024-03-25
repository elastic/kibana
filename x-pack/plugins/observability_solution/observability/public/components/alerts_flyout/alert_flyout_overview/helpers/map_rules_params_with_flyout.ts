/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  ALERT_EVALUATION_THRESHOLD,
} from '@kbn/rule-data-utils';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../pages/alert_details/alert_details';
import {
  BaseMetricExpressionParams,
  CustomMetricExpressionParams,
} from '../../../../../common/custom_threshold_rule/types';
import { TopAlert } from '../../../../typings/alerts';

export interface FlyoutThresholdData {
  observedValue: number;
  threshold: number[];
  fields: string[];
  comparator: string;
}

export const mapRuleParamsWithFlyout = (alert: TopAlert): FlyoutThresholdData[] => {
  const ruleParams = alert.fields[ALERT_RULE_PARAMETERS];
  const ruleCriteria = ruleParams?.criteria as Array<Record<string, any>>;
  const ruleId = alert.fields[ALERT_RULE_TYPE_ID];
  const observedValues = alert.fields[ALERT_EVALUATION_VALUES] || [
    alert.fields[ALERT_EVALUATION_VALUE],
  ];

  switch (ruleId) {
    case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = ruleCriteria[metricIndex] as CustomMetricExpressionParams;
        const fields = criteria.metrics.map((metric) => metric.field || 'COUNT_AGG');
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        return {
          observedValue,
          threshold,
          fields,
          comparator,
        } as unknown as FlyoutThresholdData;
      });

    case METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID || METRIC_THRESHOLD_ALERT_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = ruleCriteria[metricIndex] as BaseMetricExpressionParams & {
          metric: string;
        };
        const fields = criteria.metric;
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        return {
          observedValue,
          threshold,
          fields,
          comparator,
        } as unknown as FlyoutThresholdData;
      });

    case LOG_THRESHOLD_ALERT_TYPE_ID:
      const { comparator } = ruleParams?.count as { comparator: string };
      const flyoutMap = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [alert.fields[ALERT_EVALUATION_THRESHOLD]],
        fields: [],
        comparator,
      } as unknown as FlyoutThresholdData;
      return [flyoutMap];
    default:
      return [];
  }
};
