/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  const customTimezoneFormat =
    utcOffsetHours > 0 ? `+${utcOffsetHours}` : utcOffsetHours;

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

export const getDateDifference = (
  start: moment.Moment,
  end: moment.Moment,
  unitOfTime: DateUnit | TimeUnit
) => end.diff(start, unitOfTime);

function getFormatsAccordingToDateDifference(
  start: moment.Moment,
  end: moment.Moment
) {
  if (getDateDifference(start, end, 'years') >= 5) {
    return { dateFormat: getDateFormat('years') };
  }

  if (getDateDifference(start, end, 'months') >= 5) {
    return { dateFormat: getDateFormat('months') };
  }

  const dateFormatWithDays = getDateFormat('days');
  if (getDateDifference(start, end, 'days') > 1) {
    return { dateFormat: dateFormatWithDays };
  }

  if (getDateDifference(start, end, 'hours') >= 5) {
    return {
      dateFormat: dateFormatWithDays,
      timeFormat: getTimeFormat('minutes'),
    };
  }

  if (getDateDifference(start, end, 'minutes') >= 5) {
    return {
      dateFormat: dateFormatWithDays,
      timeFormat: getTimeFormat('seconds'),
    };
  }

  return {
    dateFormat: dateFormatWithDays,
    timeFormat: getTimeFormat('milliseconds'),
  };
}

export function asAbsoluteDateTime(
  time: number,
  timeUnit: TimeUnit = 'milliseconds'
) {
  const momentTime = moment(time);
  const formattedTz = formatTimezone(momentTime);

  return momentTime.format(
    `${getDateFormat('days')}, ${getTimeFormat(timeUnit)} ${formattedTz}`
  );
}

/**
 *
 * Returns the dates formatted according to the difference between the two dates:
 *
 * | Difference     |           Format                               |
 * | -------------- |:----------------------------------------------:|
 * | >= 5 years     | YYYY - YYYY                                    |
 * | >= 5 months    | MMM YYYY - MMM YYYY                            |
 * | > 1 day        | MMM D, YYYY - MMM D, YYYY                      |
 * | >= 5 hours     | MMM D, YYYY, HH:mm - HH:mm (UTC)               |
 * | >= 5 minutes   | MMM D, YYYY, HH:mm:ss - HH:mm:ss (UTC)         |
 * | default        | MMM D, YYYY, HH:mm:ss.SSS - HH:mm:ss.SSS (UTC) |
 *
 * @param start timestamp
 * @param end timestamp
 */
export function asRelativeDateTimeRange(start: number, end: number) {
  const momentStartTime = moment(start);
  const momentEndTime = moment(end);

  const { dateFormat, timeFormat } = getFormatsAccordingToDateDifference(
    momentStartTime,
    momentEndTime
  );

  if (timeFormat) {
    const startFormatted = momentStartTime.format(
      `${dateFormat}, ${timeFormat}`
    );
    const endFormatted = momentEndTime.format(timeFormat);
    const formattedTz = formatTimezone(momentStartTime);
    return `${startFormatted} - ${endFormatted} ${formattedTz}`;
  }

  const startFormatted = momentStartTime.format(dateFormat);
  const endFormatted = momentEndTime.format(dateFormat);
  return `${startFormatted} - ${endFormatted}`;
}
