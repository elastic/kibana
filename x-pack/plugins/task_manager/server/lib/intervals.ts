/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

  assertValidInterval(interval);

  if (isSeconds(interval)) {
    return secondsFromNow(parseInterval(interval));
  }

  return minutesFromNow(parseInterval(interval));
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

  assertValidInterval(interval);

  if (isSeconds(interval)) {
    return secondsFromDate(date, parseInterval(interval));
  }

  return minutesFromDate(date, parseInterval(interval));
}

/**
 * Returns a date that is mins minutes from now.
 *
 * @param mins The number of mintues from now
 */
export function minutesFromNow(mins: number): Date {
  return minutesFromDate(new Date(), mins);
}

/**
 * Returns a date that is mins minutes from given date.
 *
 * @param date The date to add minutes to
 * @param mins The number of mintues from given date
 */
export function minutesFromDate(date: Date, mins: number): Date {
  const result = new Date(date.valueOf());

  result.setMinutes(result.getMinutes() + mins);

  return result;
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
 */
export function assertValidInterval(interval: string) {
  if (isMinutes(interval)) {
    return interval;
  }

  if (isSeconds(interval)) {
    return interval;
  }

  throw new Error(
    `Invalid interval "${interval}". Intervals must be of the form {number}m. Example: 5m.`
  );
}

function parseInterval(interval: string) {
  return parseInt(interval, 10);
}

function isMinutes(interval: string) {
  return /^[1-9][0-9]*m$/.test(interval);
}

function isSeconds(interval: string) {
  return /^[1-9][0-9]*s$/.test(interval);
}
