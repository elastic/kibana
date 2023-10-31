/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createFormatter } from '../../../../../common/custom_threshold_rule/formatters';
import { Evaluation } from './evaluate_rule';

export type FormattedEvaluation = Omit<Evaluation, 'currentValue' | 'threshold'> & {
  currentValue: string;
  threshold: string[];
};

export const formatAlertResult = (evaluationResult: Evaluation): FormattedEvaluation => {
  const { metric, currentValue, threshold, comparator } = evaluationResult;
  const noDataValue = i18n.translate(
    'xpack.observability.customThreshold.rule.alerting.threshold.noDataFormattedValue',
    { defaultMessage: '[NO DATA]' }
  );

  if (metric.endsWith('.pct')) {
    const formatter = createFormatter('percent');
    return {
      ...evaluationResult,
      currentValue:
        currentValue !== null && currentValue !== undefined ? formatter(currentValue) : noDataValue,
      threshold: Array.isArray(threshold)
        ? threshold.map((v: number) => formatter(v))
        : [formatter(threshold)],
      comparator,
    };
  }

  const formatter = createFormatter('highPrecision');
  return {
    ...evaluationResult,
    currentValue:
      currentValue !== null && currentValue !== undefined ? formatter(currentValue) : noDataValue,
    threshold: Array.isArray(threshold)
      ? threshold.map((v: number) => formatter(v))
      : [formatter(threshold)],
    comparator,
  };
};
