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
  ApmRuleType,
} from '@kbn/rule-data-utils';
import { EsQueryRuleParams } from '@kbn/stack-alerts-plugin/public/rule_types/es_query/types';
import { i18n } from '@kbn/i18n';
import { asDuration, asPercent } from '../../../../../common';
import { createFormatter } from '../../../../../common/custom_threshold_rule/formatters';
import { metricValueFormatter } from '../../../../../common/custom_threshold_rule/metric_value_formatter';
import { METRIC_FORMATTERS } from '../../../../../common/custom_threshold_rule/formatters/snapshot_metric_formats';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../pages/alert_details/alert_details';
import {
  BaseMetricExpressionParams,
  CustomMetricExpressionParams,
} from '../../../../../common/custom_threshold_rule/types';
import { TopAlert } from '../../../../typings/alerts';
import { isFieldsSameType } from './is_fields_same_type';

export interface FlyoutThresholdData {
  observedValue: string;
  threshold: string[];
  comparator: string;
  pctAboveThreshold: string;
}

const getPctAboveThreshold = (observedValue?: number, threshold?: number[]): string => {
  if (!observedValue || !threshold) return '';
  if (threshold.length > 1) {
    return i18n.translate('xpack.observability.alertFlyout.overview.rangeThresholdLabel', {
      defaultMessage: ' (Range threshold)',
    });
  }
  return i18n.translate('xpack.observability.alertFlyout.overview.aboveThresholdLabel', {
    defaultMessage: ' ({pctValue}% above the threshold)',
    values: {
      pctValue: (((observedValue - threshold[0]) * 100) / threshold[0]).toFixed(2),
    },
  });
};

export const mapRuleParamsWithFlyout = (alert: TopAlert): FlyoutThresholdData[] | undefined => {
  const ruleParams = alert.fields[ALERT_RULE_PARAMETERS];
  if (!ruleParams) return;
  const ruleCriteria = ruleParams?.criteria as Array<Record<string, any>>;
  const ruleId = alert.fields[ALERT_RULE_TYPE_ID];
  const observedValues: number[] = alert.fields[ALERT_EVALUATION_VALUES]! || [
    alert.fields[ALERT_EVALUATION_VALUE]!,
  ];

  switch (ruleId) {
    case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = ruleCriteria[metricIndex] as CustomMetricExpressionParams;
        const fields = criteria.metrics.map((metric) => metric.field || 'COUNT_AGG');
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        const isSameFieldsType = isFieldsSameType(fields);
        const formattedValue = metricValueFormatter(
          observedValue as number,
          isSameFieldsType ? fields[0] : 'noType'
        );
        const thresholdFormattedAsString = threshold
          .map((thresholdWithRange) =>
            metricValueFormatter(thresholdWithRange, isSameFieldsType ? fields[0] : 'noType')
          )
          .join(' AND ');

        return {
          observedValue: formattedValue,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(observedValue, threshold),
        } as unknown as FlyoutThresholdData;
      });

    case METRIC_THRESHOLD_ALERT_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = ruleCriteria[metricIndex] as BaseMetricExpressionParams & {
          metric: string;
        };
        const fields = [criteria.metric];
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        const isSameFieldsType = isFieldsSameType(fields);
        const formattedValue = metricValueFormatter(
          observedValue as number,
          isSameFieldsType ? fields[0] : 'noType'
        );
        const thresholdFormattedAsString = threshold
          .map((thresholdWithRange) =>
            metricValueFormatter(thresholdWithRange, isSameFieldsType ? fields[0] : 'noType')
          )
          .join(' AND ');

        return {
          observedValue: formattedValue,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(observedValue, threshold),
        } as unknown as FlyoutThresholdData;
      });

    case METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = ruleCriteria[metricIndex] as BaseMetricExpressionParams & {
          metric: string;
        };
        const infraType = METRIC_FORMATTERS[criteria.metric].formatter;
        const formatter = createFormatter(infraType);
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        const formatThreshold = threshold.map((v: number) => {
          if (infraType === 'percent') {
            v = Number(v) / 100;
          }
          if (infraType === 'bits') {
            v = Number(v) / 8;
          }
          return v;
        });

        return {
          observedValue: formatter(observedValue),
          threshold: formatThreshold.map(formatter),
          comparator,
          pctAboveThreshold: getPctAboveThreshold(observedValue, formatThreshold),
        } as unknown as FlyoutThresholdData;
      });

    case LOG_THRESHOLD_ALERT_TYPE_ID:
      const { comparator } = ruleParams?.count as { comparator: string };
      const flyoutMap = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [alert.fields[ALERT_EVALUATION_THRESHOLD]],
        fields: [],
        comparator,
        pctAboveThreshold: getPctAboveThreshold(alert.fields[ALERT_EVALUATION_VALUE], [
          alert.fields[ALERT_EVALUATION_THRESHOLD]!,
        ]),
      } as unknown as FlyoutThresholdData;
      return [flyoutMap];

    case ApmRuleType.ErrorCount:
      const APMFlyoutMapErrorCount = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [alert.fields[ALERT_EVALUATION_THRESHOLD]],
        comparator: '>',
        pctAboveThreshold: getPctAboveThreshold(alert.fields[ALERT_EVALUATION_VALUE], [
          alert.fields[ALERT_EVALUATION_THRESHOLD]!,
        ]),
      } as unknown as FlyoutThresholdData;
      return [APMFlyoutMapErrorCount];

    case ApmRuleType.TransactionErrorRate:
      const APMFlyoutMapTransactionErrorRate = {
        observedValue: [asPercent(alert.fields[ALERT_EVALUATION_VALUE], 100)],
        threshold: [asPercent(alert.fields[ALERT_EVALUATION_THRESHOLD], 100)],
        comparator: '>',
        pctAboveThreshold: getPctAboveThreshold(alert.fields[ALERT_EVALUATION_VALUE], [
          alert.fields[ALERT_EVALUATION_THRESHOLD]!,
        ]),
      } as unknown as FlyoutThresholdData;
      return [APMFlyoutMapTransactionErrorRate];

    case ApmRuleType.TransactionDuration:
      const APMFlyoutMapTransactionDuration = {
        observedValue: [asDuration(alert.fields[ALERT_EVALUATION_VALUE])],
        threshold: [asDuration(alert.fields[ALERT_EVALUATION_THRESHOLD])],
        comparator: '>',
        pctAboveThreshold: getPctAboveThreshold(alert.fields[ALERT_EVALUATION_VALUE], [
          alert.fields[ALERT_EVALUATION_THRESHOLD]!,
        ]),
      } as unknown as FlyoutThresholdData;
      return [APMFlyoutMapTransactionDuration];

    case '.es-query':
      const { thresholdComparator, threshold } = ruleParams as EsQueryRuleParams;
      const ESQueryFlyoutMap = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold,
        comparator: thresholdComparator,
      } as unknown as FlyoutThresholdData;
      return [ESQueryFlyoutMap];
    default:
      return [];
  }
};
