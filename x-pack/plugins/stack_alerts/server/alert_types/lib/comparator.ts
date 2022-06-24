/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Comparator } from '../../../common/comparator_types';

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

export const getComparatorSchemaType = (validate: (comparator: Comparator) => string | void) =>
  schema.oneOf(
    [
      schema.literal(Comparator.GT),
      schema.literal(Comparator.LT),
      schema.literal(Comparator.GT_OR_EQ),
      schema.literal(Comparator.LT_OR_EQ),
      schema.literal(Comparator.BETWEEN),
      schema.literal(Comparator.NOT_BETWEEN),
    ],
    { validate }
  );

export const ComparatorFnNames = new Set(ComparatorFns.keys());

export function getHumanReadableComparator(comparator: Comparator) {
  return humanReadableComparators.has(comparator)
    ? humanReadableComparators.get(comparator)
    : comparator;
}
