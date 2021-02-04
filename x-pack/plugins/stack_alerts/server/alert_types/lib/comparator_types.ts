/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  NOT_BETWEEN = 'notBetween',
}

const humanReadableComparators = new Map<string, string>([
  [Comparator.LT, 'less than'],
  [Comparator.LT_OR_EQ, 'less than or equal to'],
  [Comparator.GT_OR_EQ, 'greater than or equal to'],
  [Comparator.GT, 'greater than'],
  [Comparator.BETWEEN, 'between'],
  [Comparator.NOT_BETWEEN, 'not between'],
]);

export const ComparatorFns = getComparatorFns();
export const ComparatorFnNames = new Set(ComparatorFns.keys());

type ComparatorFn = (value: number, threshold: number[]) => boolean;

function getComparatorFns(): Map<string, ComparatorFn> {
  const fns: Record<string, ComparatorFn> = {
    [Comparator.LT]: (value: number, threshold: number[]) => value < threshold[0],
    [Comparator.LT_OR_EQ]: (value: number, threshold: number[]) => value <= threshold[0],
    [Comparator.GT_OR_EQ]: (value: number, threshold: number[]) => value >= threshold[0],
    [Comparator.GT]: (value: number, threshold: number[]) => value > threshold[0],
    [Comparator.BETWEEN]: (value: number, threshold: number[]) =>
      value >= threshold[0] && value <= threshold[1],
    [Comparator.NOT_BETWEEN]: (value: number, threshold: number[]) =>
      value < threshold[0] || value > threshold[1],
  };

  const result = new Map<string, ComparatorFn>();
  for (const key of Object.keys(fns)) {
    result.set(key, fns[key]);
  }

  return result;
}

export function getHumanReadableComparator(comparator: string) {
  return humanReadableComparators.has(comparator)
    ? humanReadableComparators.get(comparator)
    : comparator;
}
