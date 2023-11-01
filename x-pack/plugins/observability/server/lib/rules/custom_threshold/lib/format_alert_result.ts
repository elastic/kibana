/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createFormatter } from '../../../../../common/custom_threshold_rule/formatters';
import { CUSTOM_EQUATION_I18N } from '../translations';
import { Evaluation } from './evaluate_rule';

export type FormattedEvaluation = Omit<Evaluation, 'currentValue' | 'threshold'> & {
  currentValue: string;
  threshold: string[];
};

export const formatAlertResult = (evaluationResult: Evaluation): FormattedEvaluation => {
  const { metrics, currentValue, threshold, comparator } = evaluationResult;
  const noDataValue = i18n.translate(
    'xpack.observability.customThreshold.rule.alerting.threshold.noDataFormattedValue',
    { defaultMessage: '[NO DATA]' }
  );

  let formatter = createFormatter('highPrecision');
  let label = evaluationResult.label || CUSTOM_EQUATION_I18N;

  if (metrics.length === 1 && metrics[0].field) {
    if (metrics[0].field.endsWith('.pct')) {
      formatter = createFormatter('percent');
    }
    label = evaluationResult.label || metrics[0].field;
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
