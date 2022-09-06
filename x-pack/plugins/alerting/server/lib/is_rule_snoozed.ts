/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule, ByWeekday, Weekday, rrulestr } from 'rrule';
import { SanitizedRule, RuleTypeParams } from '../../common/rule';

type RuleSnoozeProps = Pick<SanitizedRule<RuleTypeParams>, 'muteAll' | 'snoozeSchedule'>;

export function getRuleSnoozeEndTime(rule: RuleSnoozeProps): Date | null {
  if (rule.snoozeSchedule == null) {
    return null;
  }

  const now = Date.now();
  for (const snooze of rule.snoozeSchedule) {
    const { duration, rRule } = snooze;
    const startTimeMS = Date.parse(rRule.dtstart);
    const initialEndTime = startTimeMS + duration;
    // If now is during the first occurrence of the snooze

    if (now >= startTimeMS && now < initialEndTime) return new Date(initialEndTime);

    // Check to see if now is during a recurrence of the snooze
    if (rRule) {
      try {
        const rRuleOptions = {
          ...rRule,
          dtstart: new Date(rRule.dtstart),
          until: rRule.until ? new Date(rRule.until) : null,
          wkst: rRule.wkst ? Weekday.fromStr(rRule.wkst) : null,
          byweekday: rRule.byweekday ? parseByWeekday(rRule.byweekday) : null,
        };

        const recurrenceRule = new RRule(rRuleOptions);
        const lastOccurrence = recurrenceRule.before(new Date(now), true);
        if (!lastOccurrence) continue;
        const lastOccurrenceEndTime = lastOccurrence.getTime() + duration;
        if (now < lastOccurrenceEndTime) return new Date(lastOccurrenceEndTime);
      } catch (e) {
        throw new Error(`Failed to process RRule ${rRule}: ${e}`);
      }
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

function parseByWeekday(byweekday: Array<string | number>): ByWeekday[] {
  const rRuleString = `RRULE:BYDAY=${byweekday.join(',')}`;
  const parsedRRule = rrulestr(rRuleString);
  return parsedRRule.origOptions.byweekday as ByWeekday[];
}
