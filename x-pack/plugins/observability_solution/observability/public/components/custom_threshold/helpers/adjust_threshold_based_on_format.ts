/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
import { decimalToPct, pctToDecimal } from './corrected_percent_convert';

export const adjustThresholdBasedOnFormat = (
  previous: CustomThresholdExpressionMetric[],
  next: CustomThresholdExpressionMetric[],
  threshold: number[]
) => {
  const isPreviousPercent = Boolean(previous.length === 1 && previous[0].field?.endsWith('.pct'));
  const isPercent = Boolean(next.length === 1 && next[0].field?.endsWith('.pct'));
  return isPercent === isPreviousPercent
    ? threshold
    : isPercent
    ? threshold.map((v: number) => pctToDecimal(v))
    : isPreviousPercent
    ? threshold.map((v: number) => decimalToPct(v))
    : threshold;
};
