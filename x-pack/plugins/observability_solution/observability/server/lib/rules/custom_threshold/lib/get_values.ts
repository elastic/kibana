/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';
import { Evaluation } from './evaluate_rule';

export const getEvaluationValues = (
  alertResults: Array<Record<string, Evaluation>>,
  group: string
): Array<number | null> => {
  return alertResults.reduce((acc: Array<number | null>, result) => {
    if (result[group]) {
      acc.push(result[group].currentValue);
    }
    return acc;
  }, []);
};

export const getThreshold = (criteria: CustomMetricExpressionParams[]): number[] | undefined => {
  let hasMultipleThresholdComparator = false;
  const thresholds = criteria
    .map((c) => c.threshold)
    .reduce((acc: number[], t) => {
      if (t.length !== 1) {
        hasMultipleThresholdComparator = true;
        return acc;
      }
      return acc.concat(t[0]);
    }, []);

  // We don't save threshold if at least one of the comparators is a multiple threshold one such as 'in between'
  if (hasMultipleThresholdComparator) return undefined;

  return thresholds;
};
