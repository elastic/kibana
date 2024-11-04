/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

/**
 * Returns the timezone set on momentTime.
 * (UTC+offset) when offset if bigger than 0.
 * (UTC-offset) when offset if lower than 0.
 * @param momentTime Moment
 */
function formatTimezone(momentTime: moment.Moment) {
  const DEFAULT_TIMEZONE_FORMAT = 'Z';

  const utcOffsetHours = momentTime.utcOffset() / 60;

  const customTimezoneFormat = utcOffsetHours > 0 ? `+${utcOffsetHours}` : utcOffsetHours;

  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? customTimezoneFormat
    : DEFAULT_TIMEZONE_FORMAT;

  return momentTime.format(`(UTC${utcOffsetFormatted})`);
}

export type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';

function getTimeFormat(timeUnit: TimeUnit) {
  switch (timeUnit) {
    case 'hours':
      return 'HH';
    case 'minutes':
      return 'HH:mm';
    case 'seconds':
      return 'HH:mm:ss';
    case 'milliseconds':
      return 'HH:mm:ss.SSS';
    default:
      return '';
  }
}

type DateUnit = 'days' | 'months' | 'years';

function getDateFormat(dateUnit: DateUnit) {
  switch (dateUnit) {
    case 'years':
      return 'YYYY';
    case 'months':
      return 'MMM YYYY';
    case 'days':
      return 'MMM D, YYYY';
    default:
      return '';
  }
}

export function asAbsoluteDateTime(time: number, timeUnit: TimeUnit = 'milliseconds') {
  const momentTime = moment(time);
  const formattedTz = formatTimezone(momentTime);

  return momentTime.format(`${getDateFormat('days')}, ${getTimeFormat(timeUnit)} ${formattedTz}`);
}
