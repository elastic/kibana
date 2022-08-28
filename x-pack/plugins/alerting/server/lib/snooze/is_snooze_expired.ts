/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule, Weekday } from 'rrule';
import { RuleSnoozeSchedule } from '../../types';
import { isSnoozeActive, parseByWeekday } from './is_snooze_active';

export function isSnoozeExpired(snooze: RuleSnoozeSchedule) {
  if (isSnoozeActive(snooze)) {
    return false;
  }
  const now = Date.now();
  const { rRule } = snooze;
  // Check to see if the snooze has another upcoming occurrence in the future

  try {
    const rRuleOptions = {
      ...rRule,
      dtstart: new Date(rRule.dtstart),
      until: rRule.until ? new Date(rRule.until) : null,
      wkst: rRule.wkst ? Weekday.fromStr(rRule.wkst) : null,
      byweekday: rRule.byweekday ? parseByWeekday(rRule.byweekday) : null,
    };

    const recurrenceRule = new RRule(rRuleOptions);
    const nextOccurrence = recurrenceRule.after(new Date(now), true);
    return !nextOccurrence;
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}: ${e}`);
  }
}
