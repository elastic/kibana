/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EventsAsUnit } from '../../../../../common/constants';
import { metricValueFormatter } from '../../../../../common/custom_threshold_rule/metric_value_formatter';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import {
  AVERAGE_I18N,
  CARDINALITY_I18N,
  CUSTOM_EQUATION_I18N,
  DOCUMENT_COUNT_I18N,
  MAX_I18N,
  MIN_I18N,
  PERCENTILE_95_I18N,
  PERCENTILE_99_I18N,
  RATE_I18N,
  SUM_I18N,
} from '../translations';
import { Evaluation } from './evaluate_rule';

export type FormattedEvaluation = Omit<Evaluation, 'currentValue' | 'threshold'> & {
  currentValue: string;
  threshold: string[];
};

export const getLabel = (criterion: Evaluation) => {
  if (!criterion.label && criterion.metrics.length === 1) {
    switch (criterion.metrics[0].aggType) {
      case Aggregators.COUNT:
        return DOCUMENT_COUNT_I18N;
      case Aggregators.AVERAGE:
        return AVERAGE_I18N(criterion.metrics[0].field!);
      case Aggregators.P95:
        return PERCENTILE_95_I18N(criterion.metrics[0].field!);
      case Aggregators.P99:
        return PERCENTILE_99_I18N(criterion.metrics[0].field!);
      case Aggregators.RATE:
        return RATE_I18N(criterion.metrics[0].field!);
      case Aggregators.MAX:
        return MAX_I18N(criterion.metrics[0].field!);
      case Aggregators.MIN:
        return MIN_I18N(criterion.metrics[0].field!);
      case Aggregators.CARDINALITY:
        return CARDINALITY_I18N(criterion.metrics[0].field!);
      case Aggregators.SUM:
        return SUM_I18N(criterion.metrics[0].field!);
    }
  }
  return criterion.label || CUSTOM_EQUATION_I18N;
};

export const formatAlertResult = (evaluationResult: Evaluation): FormattedEvaluation => {
  const { metrics, currentValue, threshold, comparator } = evaluationResult;
  const noDataValue = i18n.translate(
    'xpack.observability.customThreshold.rule.alerting.threshold.noDataFormattedValue',
    { defaultMessage: '[NO DATA]' }
  );

  const label = getLabel(evaluationResult);

  const perSecIfRate = metrics[0].aggType === Aggregators.RATE ? '/s' : '';
  const eventsAsUnit =
    metrics[0].aggType === Aggregators.RATE &&
    !metrics[0].field?.endsWith('.pct') &&
    !metrics[0].field?.endsWith('.bytes')
      ? ` ${EventsAsUnit}`
      : '';
  const rateUnitPerSec = eventsAsUnit + perSecIfRate;

  return {
    ...evaluationResult,
    currentValue:
      currentValue !== null && currentValue !== undefined
        ? metricValueFormatter(currentValue, metrics[0].field) + rateUnitPerSec
        : noDataValue,
    label: label || CUSTOM_EQUATION_I18N,
    threshold: Array.isArray(threshold)
      ? threshold.map((v: number) => metricValueFormatter(v, metrics[0].field) + rateUnitPerSec)
      : [metricValueFormatter(currentValue, metrics[0].field) + rateUnitPerSec],
    comparator,
  };
};
