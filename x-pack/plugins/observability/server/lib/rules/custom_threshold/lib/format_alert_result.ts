/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { createFormatter } from '../../../../../common/custom_threshold_rule/formatters';
import {
  AVERAGE_I18N,
  CARDINALITY_I18N,
  CUSTOM_EQUATION_I18N,
  DOCUMENT_COUNT_I18N,
  MAX_I18N,
  MIN_I18N,
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

  let formatter = createFormatter('highPrecision');
  const label = getLabel(evaluationResult);

  if (metrics.length === 1 && metrics[0].field && metrics[0].field.endsWith('.pct')) {
    formatter = createFormatter('percent');
  }

  return {
    ...evaluationResult,
    currentValue:
      currentValue !== null && currentValue !== undefined ? formatter(currentValue) : noDataValue,
    label: label || CUSTOM_EQUATION_I18N,
    threshold: Array.isArray(threshold)
      ? threshold.map((v: number) => formatter(v))
      : [formatter(threshold)],
    comparator,
  };
};
