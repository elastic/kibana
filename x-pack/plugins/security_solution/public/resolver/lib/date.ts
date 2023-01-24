/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DurationDetails, DurationTypes } from '../types';

/**
 * Given a time, it will convert it to a unix timestamp if not one already. If it is unable to do so, it will return NaN
 */
export const getUnixTime = (time: number | string): number => {
  if (!time) {
    return NaN;
  }
  if (typeof time === 'number') {
    return time;
  }
  // If it's a date string just get the time in MS
  let unixTime = Date.parse(time);
  if (Number.isNaN(unixTime)) {
    // If not an ISO date string, last check will be if it's a unix timestamp string
    unixTime = parseInt(time, 10);
  }

  return unixTime;
};

/*
 * Given two unix timestamps, it will return an object containing the time difference and properly pluralized friendly version of the time difference.
 * i.e. a time difference of 1000ms will yield => { duration: 1, durationType: 'second' } and 10000ms will yield => { duration: 10, durationType: 'seconds' }
 *
 * If `from` or `to` cannot be parsed, `undefined` will be returned.
 */
export const getFriendlyElapsedTime = (
  from: number | string,
  to: number | string
): DurationDetails | undefined => {
  const startTime = getUnixTime(from);
  const endTime = getUnixTime(to);

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return undefined;
  }
  const elapsedTimeInMs = endTime - startTime;

  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  let duration: DurationDetails['duration'];
  let singularType: DurationTypes;
  let pluralType: DurationTypes;
  switch (true) {
    case elapsedTimeInMs >= year:
      duration = Math.floor(elapsedTimeInMs / year);
      singularType = 'year';
      pluralType = 'years';
      break;
    case elapsedTimeInMs >= month:
      duration = Math.floor(elapsedTimeInMs / month);
      singularType = 'month';
      pluralType = 'months';
      break;
    case elapsedTimeInMs >= week:
      duration = Math.floor(elapsedTimeInMs / week);
      singularType = 'week';
      pluralType = 'weeks';
      break;
    case elapsedTimeInMs >= day:
      duration = Math.floor(elapsedTimeInMs / day);
      singularType = 'day';
      pluralType = 'days';
      break;
    case elapsedTimeInMs >= hour:
      duration = Math.floor(elapsedTimeInMs / hour);
      singularType = 'hour';
      pluralType = 'hours';
      break;
    case elapsedTimeInMs >= minute:
      duration = Math.floor(elapsedTimeInMs / minute);
      singularType = 'minute';
      pluralType = 'minutes';
      break;
    case elapsedTimeInMs >= second:
      duration = Math.floor(elapsedTimeInMs / second);
      singularType = 'second';
      pluralType = 'seconds';
      break;
    case elapsedTimeInMs === 0:
      duration = '<1';
      singularType = 'millisecond';
      pluralType = 'millisecond'; // Would never show
      break;
    default:
      duration = elapsedTimeInMs;
      singularType = 'millisecond';
      pluralType = 'milliseconds';
      break;
  }

  const durationType = duration === 1 ? singularType : pluralType;
  return { duration, durationType };
};
