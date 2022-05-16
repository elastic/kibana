/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleSnooze = Array<{
  startTime: string;
  duration: number;
  timeZone: string;
  // For scheduled/recurring snoozes, `id` uniquely identifies them so that they can be displayed, modified, and deleted individually
  id?: string;
  // An iCal RRULE string to define a recurrence schedule, see https://github.com/jakubroztocil/rrule for the spec
  rRule?: string;
}>;
