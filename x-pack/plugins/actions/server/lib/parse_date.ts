/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

export function parseDate(
  dateString: string | undefined,
  propertyName: string,
  defaultValue: Date
): Date {
  if (dateString === undefined) {
    return defaultValue;
  }

  const parsedDate = parseIsoOrRelativeDate(dateString);
  if (parsedDate === undefined) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.actionsClient.invalidDate', {
        defaultMessage: 'Invalid date for parameter {field}: "{dateValue}"',
        values: {
          field: propertyName,
          dateValue: dateString,
        },
      })
    );
  }

  return parsedDate;
}

/**
 * Parse an ISO date or NNx duration string as a Date
 *
 * @param dateString an ISO date or NNx "duration" string representing now-duration
 * @returns a Date or undefined if the dateString was not valid
 */
export function parseIsoOrRelativeDate(dateString: string): Date | undefined {
  const epochMillis = Date.parse(dateString);
  if (!isNaN(epochMillis)) return new Date(epochMillis);

  let millis: number;
  try {
    millis = parseDuration(dateString);
  } catch (err) {
    return;
  }

  return new Date(Date.now() - millis);
}

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
