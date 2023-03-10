/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WeekdayStr, Options } from '@kbn/rrule';

type SnoozeRRule = Partial<RRuleRecord> & Pick<RRuleRecord, 'dtstart' | 'tzid' | 'freq'>;

export interface RuleSnoozeSchedule {
  duration: number;
  rRule: SnoozeRRule;
  // For scheduled/recurring snoozes, `id` uniquely identifies them so that they can be displayed, modified, and deleted individually
  id?: string;
  skipRecurrences?: string[];
}

// Type signature of has to be repeated here to avoid issues with SavedObject compatibility
// RuleSnooze = RuleSnoozeSchedule[] throws typescript errors across the whole lib
export type RuleSnooze = Array<{
  duration: number;
  rRule: SnoozeRRule;
  id?: string;
  skipRecurrences?: string[];
}>;

// An iCal RRULE  to define a recurrence schedule, see https://github.com/jakubroztocil/rrule for the spec
export type RRuleRecord = Omit<Options, 'dtstart' | 'byweekday' | 'wkst' | 'until'> & {
  dtstart: string;
  byweekday?: Array<WeekdayStr | string | number>;
  wkst?: WeekdayStr;
  until?: string;
};
