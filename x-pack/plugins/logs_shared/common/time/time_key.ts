/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ascending, bisector } from 'd3-array';
import * as rt from 'io-ts';
import moment from 'moment';
import { pipe } from 'fp-ts/lib/pipeable';
import { chain } from 'fp-ts/lib/Either';

export const NANO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3,9}Z$/;

export const DateFromStringOrNumber = new rt.Type<string, number | string>(
  'DateFromStringOrNumber',
  (input): input is string => typeof input === 'string',
  (input, context) => {
    if (typeof input === 'string') {
      return NANO_DATE_PATTERN.test(input) ? rt.success(input) : rt.failure(input, context);
    }
    return pipe(
      rt.number.validate(input, context),
      chain((timestamp) => {
        const momentValue = moment(timestamp);
        return momentValue.isValid()
          ? rt.success(momentValue.toISOString())
          : rt.failure(timestamp, context);
      })
    );
  },
  String
);

export const minimalTimeKeyRT = rt.type({
  time: DateFromStringOrNumber,
  tiebreaker: rt.number,
});

export const timeKeyRT = rt.intersection([
  minimalTimeKeyRT,
  rt.partial({
    gid: rt.string,
    fromAutoReload: rt.boolean,
  }),
]);
export type TimeKey = rt.TypeOf<typeof timeKeyRT>;

export interface UniqueTimeKey extends TimeKey {
  gid: string;
}

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
