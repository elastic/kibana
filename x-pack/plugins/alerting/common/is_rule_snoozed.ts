/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { parseInterval } from '@kbn/data-plugin/common';
import { SanitizedRule, RuleTypeParams } from './rule';

type RuleSnoozeProps = Pick<SanitizedRule<RuleTypeParams>, 'snoozeIndefinitely' | 'snoozeSchedule'>;

export function getRuleSnoozeEndTime(rule: RuleSnoozeProps): Date | null {
  if (rule.snoozeSchedule == null) {
    return null;
  }

  const now = Date.now();
  for (const snooze of rule.snoozeSchedule) {
    const { startTime, duration, repeatInterval, occurrences, repeatEndTime } = snooze;
    const startTimeMS = Date.parse(startTime);
    const initialEndTime = startTimeMS + duration;
    // If now is during the first occurrence of the snooze

    if (now >= startTimeMS && now < initialEndTime) return new Date(initialEndTime);

    // Check to see if now is during a recurrence of the snooze
    if (repeatInterval) {
      let occurrence;
      let occurrenceStartTime;
      if (repeatEndTime) {
        const repeatEndTimeMS = Date.parse(repeatEndTime);
        if (now >= repeatEndTimeMS) continue;
      }
      const timeFromInitialStart = now - startTimeMS;

      // Handle day-of-week recurrences
      if (repeatInterval.startsWith('DOW:')) {
        const [, daysOfWeekString] = repeatInterval.split(':');
        const repeatDays = daysOfWeekString
          .split('')
          .map((d) => Number(d))
          .sort();
        const today = moment(now).isoWeekday();

        if (!repeatDays.includes(today)) continue;

        const weeksFromInitialStart = moment(now).diff(moment(startTime), 'weeks');
        const occurrencesPerWeek = repeatDays.length;
        occurrence = weeksFromInitialStart * occurrencesPerWeek + repeatDays.indexOf(today);
        const nowMoment = moment(now);
        occurrenceStartTime = moment(startTime)
          .year(nowMoment.year())
          .dayOfYear(nowMoment.dayOfYear())
          .valueOf();
      } else {
        const interval = parseInterval(repeatInterval)?.asMilliseconds();
        if (!interval) continue;

        occurrence = Math.floor(timeFromInitialStart / interval);
        occurrenceStartTime = interval * occurrence + startTimeMS;
      }

      if (occurrences && occurrence > occurrences) continue;

      const occurrenceEndTime = occurrenceStartTime + duration;

      if (now >= occurrenceStartTime && now < occurrenceEndTime) return new Date(occurrenceEndTime);
    }
  }

  return null;
}

export function isRuleSnoozed(rule: RuleSnoozeProps) {
  if (rule.snoozeIndefinitely) {
    return true;
  }
  return Boolean(getRuleSnoozeEndTime(rule));
}
