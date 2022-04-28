/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rrulestr } from 'rrule';
import { SanitizedRule, RuleTypeParams } from './rule';

type RuleSnoozeProps = Pick<SanitizedRule<RuleTypeParams>, 'muteAll' | 'snoozeSchedule'>;

export function getRuleSnoozeEndTime(rule: RuleSnoozeProps): Date | null {
  if (rule.snoozeSchedule == null) {
    return null;
  }

  const now = Date.now();
  for (const snooze of rule.snoozeSchedule) {
    const { startTime, duration, rRule } = snooze;
    const startTimeMS = Date.parse(startTime);
    const initialEndTime = startTimeMS + duration;
    // If now is during the first occurrence of the snooze

    if (now >= startTimeMS && now < initialEndTime) return new Date(initialEndTime);

    // Check to see if now is during a recurrence of the snooze
    if (rRule) {
      const recurrenceRule = rrulestr(rRule);
      const lastOccurrence = recurrenceRule.before(new Date(now), true);
      if (!lastOccurrence) continue;
      const lastOccurrenceEndTime = lastOccurrence.getTime() + duration;
      if (lastOccurrenceEndTime > now) return new Date(lastOccurrenceEndTime);
    }
  }

  return null;
}

export function isRuleSnoozed(rule: RuleSnoozeProps) {
  if (rule.muteAll) {
    return true;
  }
  return Boolean(getRuleSnoozeEndTime(rule));
}
