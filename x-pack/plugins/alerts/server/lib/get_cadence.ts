/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';

export enum TimeUnit {
  Minute = 'm',
  Second = 's',
  Hour = 'h',
  Day = 'd',
}
const VALID_CADENCE = new Set(Object.values(TimeUnit));
const CADENCE_IN_MS: Record<TimeUnit, number> = {
  [TimeUnit.Second]: 1000,
  [TimeUnit.Minute]: 60 * 1000,
  [TimeUnit.Hour]: 60 * 60 * 1000,
  [TimeUnit.Day]: 24 * 60 * 60 * 1000,
};

const isNumeric = (numAsStr: string) => /^\d+$/.test(numAsStr);

export const parseIntervalAsMillisecond = memoize((value: string): number => {
  const numericAsStr: string = value.slice(0, -1);
  const numeric: number = parseInt(numericAsStr, 10);
  const cadence: TimeUnit | string = value.slice(-1);
  if (
    !VALID_CADENCE.has(cadence as TimeUnit) ||
    isNaN(numeric) ||
    numeric <= 0 ||
    !isNumeric(numericAsStr)
  ) {
    throw new Error(
      `Invalid time value "${value}". Time must be of the form {number}m. Example: 5m.`
    );
  }
  return numeric * CADENCE_IN_MS[cadence as TimeUnit];
});

/**
 * Returns a date that is the specified interval from given date.
 *
 * @param {Date} date - The date to add interval to
 * @param {string} interval - THe time of the form `Nm` such as `5m`
 */
export function timePeriodBeforeDate(date: Date, timePeriod: string): Date {
  const result = new Date(date.valueOf());
  const milisecFromTime = parseIntervalAsMillisecond(timePeriod);
  result.setMilliseconds(result.getMilliseconds() - milisecFromTime);
  return result;
}
