/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator } from './comparator_types';

export type ComparatorFn = (value: number, threshold: number[]) => boolean;

const humanReadableComparators = new Map<Comparator, string>([
  [Comparator.LT, 'less than'],
  [Comparator.LT_OR_EQ, 'less than or equal to'],
  [Comparator.GT_OR_EQ, 'greater than or equal to'],
  [Comparator.GT, 'greater than'],
  [Comparator.BETWEEN, 'between'],
  [Comparator.NOT_BETWEEN, 'not between'],
]);

export const ComparatorFns = new Map<Comparator, ComparatorFn>([
  [Comparator.LT, (value: number, threshold: number[]) => value < threshold[0]],
  [Comparator.LT_OR_EQ, (value: number, threshold: number[]) => value <= threshold[0]],
  [Comparator.GT_OR_EQ, (value: number, threshold: number[]) => value >= threshold[0]],
  [Comparator.GT, (value: number, threshold: number[]) => value > threshold[0]],
  [
    Comparator.BETWEEN,
    (value: number, threshold: number[]) => value >= threshold[0] && value <= threshold[1],
  ],
  [
    Comparator.NOT_BETWEEN,
    (value: number, threshold: number[]) => value < threshold[0] || value > threshold[1],
  ],
]);

export const getComparatorScript = (
  comparator: Comparator,
  threshold: number[],
  fieldName: string
) => {
  if (threshold.length === 0) {
    throw new Error('Threshold value required');
  }

  function getThresholdString(thresh: number) {
    return Number.isInteger(thresh) ? `${thresh}L` : `${thresh}`;
  }

  switch (comparator) {
    case Comparator.LT:
      return `${fieldName} < ${getThresholdString(threshold[0])}`;
    case Comparator.LT_OR_EQ:
      return `${fieldName} <= ${getThresholdString(threshold[0])}`;
    case Comparator.GT:
      return `${fieldName} > ${getThresholdString(threshold[0])}`;
    case Comparator.GT_OR_EQ:
      return `${fieldName} >= ${getThresholdString(threshold[0])}`;
    case Comparator.BETWEEN:
      if (threshold.length < 2) {
        throw new Error('Threshold values required');
      }
      return `${fieldName} >= ${getThresholdString(
        threshold[0]
      )} && ${fieldName} <= ${getThresholdString(threshold[1])}`;
    case Comparator.NOT_BETWEEN:
      if (threshold.length < 2) {
        throw new Error('Threshold values required');
      }
      return `${fieldName} < ${getThresholdString(
        threshold[0]
      )} || ${fieldName} > ${getThresholdString(threshold[1])}`;
  }
};

export const ComparatorFnNames = new Set(ComparatorFns.keys());

export function getHumanReadableComparator(comparator: Comparator) {
  return humanReadableComparators.has(comparator)
    ? humanReadableComparators.get(comparator)
    : comparator;
}
