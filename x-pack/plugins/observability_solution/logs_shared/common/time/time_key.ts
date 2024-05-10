/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeKey } from '@kbn/io-ts-utils';
import { ascending, bisector } from 'd3-array';

export type Comparator = (firstValue: any, secondValue: any) => number;

export function compareTimeKeys(
  firstKey: TimeKey,
  secondKey: TimeKey,
  compareValues: Comparator = ascending
): number {
  const timeComparison = compareValues(firstKey.time, secondKey.time);

  if (timeComparison === 0) {
    const tiebreakerComparison = compareValues(firstKey.tiebreaker, secondKey.tiebreaker);

    if (
      tiebreakerComparison === 0 &&
      typeof firstKey.gid !== 'undefined' &&
      typeof secondKey.gid !== 'undefined'
    ) {
      return compareValues(firstKey.gid, secondKey.gid);
    }

    return tiebreakerComparison;
  }

  return timeComparison;
}

export const compareToTimeKey =
  <Value>(keyAccessor: (value: Value) => TimeKey, compareValues?: Comparator) =>
  (value: Value, key: TimeKey) =>
    compareTimeKeys(keyAccessor(value), key, compareValues);

export const getIndexAtTimeKey = <Value>(
  keyAccessor: (value: Value) => TimeKey,
  compareValues?: Comparator
) => {
  const comparator = compareToTimeKey(keyAccessor, compareValues);
  const collectionBisector = bisector(comparator);

  return (collection: Value[], key: TimeKey): number | null => {
    const index = collectionBisector.left(collection, key);

    if (index >= collection.length) {
      return null;
    }

    if (comparator(collection[index], key) !== 0) {
      return null;
    }

    return index;
  };
};
