/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DurationDetails, DurationTypes } from '../types';

/*
 * Given two unix timestamps, it will return an object containing the time difference and properly pluralized friendly version of the time difference.
 * i.e. a time difference of 1000ms will yield => { duration: 1, durationType: 'second' } and 10000ms will yield => { duration: 10, durationType: 'seconds' }
 *
 */
export const getFriendlyElapsedTime = (
  from: number | string,
  to: number | string
): DurationDetails | null => {
  const startTime = typeof from === 'number' ? from : parseInt(from, 10);
  const endTime = typeof to === 'number' ? to : parseInt(to, 10);
  const elapsedTimeInMs = endTime - startTime;

  if (Number.isNaN(elapsedTimeInMs)) {
    return null;
  }

  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  let duration: number;
  let singularType: DurationTypes;
  let pluralType: DurationTypes;
  switch (true) {
    case elapsedTimeInMs >= year:
      duration = elapsedTimeInMs / year;
      singularType = 'year';
      pluralType = 'years';
      break;
    case elapsedTimeInMs >= month:
      duration = elapsedTimeInMs / month;
      singularType = 'month';
      pluralType = 'months';
      break;
    case elapsedTimeInMs >= week:
      duration = elapsedTimeInMs / week;
      singularType = 'week';
      pluralType = 'weeks';
      break;
    case elapsedTimeInMs >= day:
      duration = elapsedTimeInMs / day;
      singularType = 'day';
      pluralType = 'days';
      break;
    case elapsedTimeInMs >= hour:
      duration = elapsedTimeInMs / hour;
      singularType = 'hour';
      pluralType = 'hours';
      break;
    case elapsedTimeInMs >= minute:
      duration = elapsedTimeInMs / minute;
      singularType = 'minute';
      pluralType = 'minutes';
      break;
    case elapsedTimeInMs >= second:
      duration = elapsedTimeInMs / second;
      singularType = 'second';
      pluralType = 'seconds';
      break;
    default:
      duration = elapsedTimeInMs;
      singularType = 'millisecond';
      pluralType = 'milliseconds';
      break;
  }

  const durationType = duration > 1 ? pluralType : singularType;
  return { duration: Math.floor(duration), durationType };
};
