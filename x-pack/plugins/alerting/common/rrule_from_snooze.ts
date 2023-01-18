/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule, ByWeekday, Weekday, rrulestr } from 'rrule';
import { SnoozeRRule } from './rule_snooze_type';

export const parseByWeekday = (byweekday: Array<string | number>): ByWeekday[] => {
  const rRuleString = `RRULE:BYDAY=${byweekday.join(',')}`;
  const parsedRRule = rrulestr(rRuleString);
  return parsedRRule.origOptions.byweekday as ByWeekday[];
};

export const getRRuleFromSnooze = (rRule: SnoozeRRule) => {
  return new RRule({
    ...rRule,
    dtstart: new Date(rRule.dtstart),
    until: rRule.until ? new Date(rRule.until) : null,
    wkst: rRule.wkst ? Weekday.fromStr(rRule.wkst) : null,
    byweekday: rRule.byweekday ? parseByWeekday(rRule.byweekday) : null,
  });
};
