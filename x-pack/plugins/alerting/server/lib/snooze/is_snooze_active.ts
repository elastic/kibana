/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { RRule, ByWeekday, Weekday, rrulestr } from 'rrule';
import { RuleSnoozeSchedule } from '../../types';

const MAX_TIMESTAMP = 8640000000000000;

/**
 * Converts the UTC date into the user's local time zone, but still in UTC.
 * This must be done because rrule does not care about timezones, so for the result
 * to be correct, we must ensure everything is timezone agnostic.
 *
 * example: 2023-03-29 08:00:00 CET -> 2023-03-29 08:00:00 UTC
 */
const utcToLocalUtc = (date: Date, tz: string) => {
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
const localUtcToUtc = (date: Date, tz: string) => {
  const localTimeString = moment.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS');
  return moment.tz(localTimeString, tz).utc().toDate();
};

export function isSnoozeActive(snooze: RuleSnoozeSchedule) {
  const { duration, rRule, id } = snooze;
  if (duration === -1)
    return {
      id,
      snoozeEndTime: new Date(MAX_TIMESTAMP),
    };
  const startTimeMS = Date.parse(rRule.dtstart);
  const initialEndTime = startTimeMS + duration;
  const isInitialStartSkipped = snooze.skipRecurrences?.includes(rRule.dtstart);
  // If now is during the first occurrence of the snooze
  const now = Date.now();
  if (now >= startTimeMS && now < initialEndTime && !isInitialStartSkipped)
    return {
      snoozeEndTime: new Date(initialEndTime),
      lastOccurrence: new Date(rRule.dtstart),
      id,
    };

  // Check to see if now is during a recurrence of the snooze

  const { tzid, ...restRRule } = rRule;
  const startDate = utcToLocalUtc(new Date(rRule.dtstart), tzid);
  const nowDate = utcToLocalUtc(new Date(now), tzid);

  try {
    const rRuleOptions = {
      ...restRRule,
      dtstart: startDate,
      until: rRule.until ? utcToLocalUtc(new Date(rRule.until), tzid) : null,
      wkst: rRule.wkst ? Weekday.fromStr(rRule.wkst) : null,
      byweekday: rRule.byweekday ? parseByWeekday(rRule.byweekday) : null,
    };

    const recurrenceRule = new RRule(rRuleOptions);
    const lastOccurrence = recurrenceRule.before(nowDate, true);
    if (!lastOccurrence) return null;
    // Check if the current recurrence has been skipped manually
    if (snooze.skipRecurrences?.includes(lastOccurrence.toISOString())) return null;
    const lastOccurrenceEndTime = lastOccurrence.getTime() + duration;
    if (now < lastOccurrenceEndTime)
      return {
        lastOccurrence,
        snoozeEndTime: localUtcToUtc(new Date(lastOccurrenceEndTime), tzid),
        id,
      };
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}: ${e}`);
  }

  return null;
}

export function parseByWeekday(byweekday: Array<string | number>): ByWeekday[] {
  const rRuleString = `RRULE:BYDAY=${byweekday.join(',')}`;
  const parsedRRule = rrulestr(rRuleString);
  return parsedRRule.origOptions.byweekday as ByWeekday[];
}
