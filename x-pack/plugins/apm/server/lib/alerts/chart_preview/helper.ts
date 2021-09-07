/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import moment from 'moment';

const getToEnumRt = <T>(enumObj: T, enumName = 'enum') =>
  new t.Type<T[keyof T], string>(
    enumName,
    (u): u is T[keyof T] => Object.values(enumObj).includes(u),
    (u, c) =>
      Object.values(enumObj).includes(u)
        ? t.success(u as T[keyof T])
        : t.failure(u, c),
    (a) => (a as unknown) as string
  );

export enum TIME_UNITS {
  SECOND = 's',
  MINUTE = 'm',
  HOUR = 'h',
  DAY = 'd',
}

export const toTimeUnitRt = getToEnumRt(TIME_UNITS, 'timeUnitRt');

const BUCKET_SIZE = 20;

export function getIntervalAndTimeRange({
  windowSize,
  windowUnit,
}: {
  windowSize: number;
  windowUnit: TIME_UNITS;
}) {
  const end = Date.now();
  const start =
    end -
    moment.duration(windowSize, windowUnit).asMilliseconds() * BUCKET_SIZE;

  return {
    interval: `${windowSize}${windowUnit}`,
    start,
    end,
  };
}
