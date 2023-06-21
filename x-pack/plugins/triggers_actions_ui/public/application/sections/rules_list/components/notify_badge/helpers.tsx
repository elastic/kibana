/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleSnooze, RuleSnoozeSchedule } from '@kbn/alerting-plugin/common';
import moment from 'moment';

export const isRuleSnoozed = (rule: { isSnoozedUntil?: Date | null; muteAll: boolean }) =>
  Boolean(
    (rule.isSnoozedUntil && new Date(rule.isSnoozedUntil).getTime() > Date.now()) || rule.muteAll
  );

export const getNextRuleSnoozeSchedule = (rule: { snoozeSchedule?: RuleSnooze }) => {
  if (!rule.snoozeSchedule) return null;
  // Disregard any snoozes without ids; these are non-scheduled snoozes
  const explicitlyScheduledSnoozes = rule.snoozeSchedule.filter((s) => Boolean(s.id));
  if (explicitlyScheduledSnoozes.length === 0) return null;
  const nextSchedule = explicitlyScheduledSnoozes.reduce(
    (a: RuleSnoozeSchedule, b: RuleSnoozeSchedule) => {
      if (moment(b.rRule.dtstart).isBefore(moment(a.rRule.dtstart))) return b;
      return a;
    }
  );
  return nextSchedule;
};
