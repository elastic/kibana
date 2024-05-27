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

export const getThreshold = (
  criteria: CustomMetricExpressionParams[]
): Array<number[] | number> | undefined => {
  const thresholds = criteria
    .map((c) => c.threshold)
    .reduce((acc: Array<number[] | number>, t) => {
      if (t.length !== 1) {
        return acc.concat([t]);
      }
      return acc.concat(t);
    }, []);

  return thresholds;
};
