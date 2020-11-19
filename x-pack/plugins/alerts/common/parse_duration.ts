/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

// parse an interval string '{digit*}{s|m|h|d}' into milliseconds
export function parseDuration(duration: string): number {
  const parsed = parseInt(duration, 10);
  if (isSeconds(duration)) {
    return parsed * 1000;
  } else if (isMinutes(duration)) {
    return parsed * 60 * 1000;
  } else if (isHours(duration)) {
    return parsed * 60 * 60 * 1000;
  } else if (isDays(duration)) {
    return parsed * 24 * 60 * 60 * 1000;
  }
  throw new Error(
    `Invalid duration "${duration}". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"`
  );
}

export function getDurationNumberInItsUnit(duration: string): number {
  return parseInt(duration.replace(/[^0-9.]/g, ''), 0);
}

export function getDurationUnitValue(duration: string): string {
  const durationNumber = getDurationNumberInItsUnit(duration);
  return duration.replace(durationNumber.toString(), '');
}

export function validateDurationSchema(duration: string) {
  if (duration.match(SECONDS_REGEX)) {
    return;
  }
  if (duration.match(MINUTES_REGEX)) {
    return;
  }
  if (duration.match(HOURS_REGEX)) {
    return;
  }
  if (duration.match(DAYS_REGEX)) {
    return;
  }
  return 'string is not a valid duration: ' + duration;
}

function isSeconds(duration: string) {
  return SECONDS_REGEX.test(duration);
}

function isMinutes(duration: string) {
  return MINUTES_REGEX.test(duration);
}

function isHours(duration: string) {
  return HOURS_REGEX.test(duration);
}

function isDays(duration: string) {
  return DAYS_REGEX.test(duration);
}
