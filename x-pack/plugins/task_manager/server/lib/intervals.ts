/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString, memoize } from 'lodash';

export enum IntervalCadence {
  Minute = 'm',
  Second = 's',
  Hour = 'h',
  Day = 'd',
}
const VALID_CADENCE = new Set(Object.values(IntervalCadence));
const CADENCE_IN_MS: Record<IntervalCadence, number> = {
  [IntervalCadence.Second]: 1000,
  [IntervalCadence.Minute]: 60 * 1000,
  [IntervalCadence.Hour]: 60 * 60 * 1000,
  [IntervalCadence.Day]: 24 * 60 * 60 * 1000,
};

function isCadence(cadence: IntervalCadence | string): cadence is IntervalCadence {
  return VALID_CADENCE.has(cadence as IntervalCadence);
}

export function asInterval(ms: number): string {
  const secondsRemainder = ms % 1000;
  const minutesRemainder = ms % 60000;
  return secondsRemainder ? `${ms}ms` : minutesRemainder ? `${ms / 1000}s` : `${ms / 60000}m`;
}

/**
 * Returns a date that is the specified interval from now. Currently,
 * only minute-intervals and second-intervals are supported.
 *
 * @param {string} interval - An interval of the form `Nm` such as `5m`
 */
export function intervalFromNow(interval?: string): Date | undefined {
  if (interval === undefined) {
    return;
  }
  return secondsFromNow(parseIntervalAsSecond(interval));
}

/**
 * Returns a date that is the specified interval from given date. Currently,
 * only minute-intervals and second-intervals are supported.
 *
 * @param {Date} date - The date to add interval to
 * @param {string} interval - An interval of the form `Nm` such as `5m`
 */
export function intervalFromDate(date: Date, interval?: string): Date | undefined {
  if (interval === undefined) {
    return;
  }
  return secondsFromDate(date, parseIntervalAsSecond(interval));
}

export function maxIntervalFromDate(
  date: Date,
  ...intervals: Array<string | undefined>
): Date | undefined {
  const maxSeconds = Math.max(...intervals.filter(isString).map(parseIntervalAsSecond));
  if (!isNaN(maxSeconds)) {
    return secondsFromDate(date, maxSeconds);
  }
}

/**
 * Returns a date that is secs seconds from now.
 *
 * @param secs The number of seconds from now
 */
export function secondsFromNow(secs: number): Date {
  return secondsFromDate(new Date(), secs);
}

/**
 * Returns a date that is secs seconds from given date.
 *
 * @param date The date to add seconds to
 * @param secs The number of seconds from given date
 */
export function secondsFromDate(date: Date, secs: number): Date {
  const result = new Date(date.valueOf());
  result.setSeconds(result.getSeconds() + secs);
  return result;
}

/**
 * Verifies that the specified interval matches our expected format.
 *
 * @param {string} interval - An interval such as `5m` or `10s`
 * @returns {number} The interval as seconds
 */
export const parseIntervalAsSecond = memoize((interval: string): number => {
  return Math.round(parseIntervalAsMillisecond(interval) / 1000);
});

export const parseIntervalAsMillisecond = memoize((interval: string): number => {
  const numericAsStr: string = interval.slice(0, -1);
  const numeric: number = parseInt(numericAsStr, 10);
  const cadence: IntervalCadence | string = interval.slice(-1);
  if (!isCadence(cadence) || isNaN(numeric) || numeric <= 0 || !isNumeric(numericAsStr)) {
    throw new Error(
      `Invalid interval "${interval}". Intervals must be of the form {number}m. Example: 5m.`
    );
  }
  return numeric * CADENCE_IN_MS[cadence];
});

const isNumeric = (numAsStr: string) => /^\d+$/.test(numAsStr);
