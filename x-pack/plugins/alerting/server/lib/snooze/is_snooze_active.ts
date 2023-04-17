/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule, Weekday } from 'rrule';
import { RuleSnoozeSchedule } from '../../types';
import { parseByWeekday } from '../rrule';
import { utcToLocalUtc, localUtcToUtc } from './timezone_helpers';

const MAX_TIMESTAMP = 8640000000000000;

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
    if (nowDate.getTime() < lastOccurrenceEndTime)
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
