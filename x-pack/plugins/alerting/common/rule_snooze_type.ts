/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WeekdayStr, Frequency } from '@kbn/rrule';

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
export interface RRuleRecord {
  dtstart: string;
  tzid: string;
  freq: Frequency;
  until?: string;
  count?: number;
  interval?: number;
  wkst?: WeekdayStr;
  byweekday?: Array<WeekdayStr | number>;
  bymonth?: number[];
  bysetpos?: number[];
  bymonthday: number[];
  byyearday: number[];
  byweekno: number[];
  byhour: number[];
  byminute: number[];
  bysecond: number[];
}
