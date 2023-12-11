/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WeekdayStr } from '@kbn/rrule';

type RRuleFreq = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RRuleAttributes {
  dtstart: string;
  tzid: string;
  freq?: RRuleFreq;
  until?: string;
  count?: number;
  interval?: number;
  wkst?: WeekdayStr;
  byweekday?: Array<string | number>;
  bymonth?: number[];
  bysetpos?: number[];
  bymonthday?: number[];
  byyearday?: number[];
  byweekno?: number[];
  byhour?: number[];
  byminute?: number[];
  bysecond?: number[];
}
