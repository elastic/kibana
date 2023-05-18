/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment-timezone';

/**
 * Converts the UTC date into the user's local time zone, but still in UTC.
 * This must be done because rrule does not care about timezones, so for the result
 * to be correct, we must ensure everything is timezone agnostic.
 *
 * example: 2023-03-29 08:00:00 CET -> 2023-03-29 08:00:00 UTC
 */
export const utcToLocalUtc = (date: Date, tz: string) => {
  const localTime = moment(date).tz(tz);
  const localTimeInUTC = moment(localTime).tz('UTC', true);
  return localTimeInUTC.utc().toDate();
};

/**
 * Converts the local date in UTC back into actual UTC. After rrule does its thing,
 * we would still like to keep everything in UTC in the business logic, hence why we
 * need to convert everything back
 *
 * Example: 2023-03-29 08:00:00 UTC (from the utcToLocalUtc output) -> 2023-03-29 06:00:00 UTC (Real UTC)
 */
export const localUtcToUtc = (date: Date, tz: string) => {
  const localTimeString = moment.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS');
  return moment.tz(localTimeString, tz).utc().toDate();
};
