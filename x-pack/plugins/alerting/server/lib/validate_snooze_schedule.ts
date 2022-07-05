/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from 'rrule';
import { RuleSnoozeSchedule } from '../types';

export const validateSnoozeSchedule = (schedule: RuleSnoozeSchedule) => {
  const intervalIsDaily = schedule.rRule.freq === Frequency.DAILY;
  const durationInDays = Math.floor(schedule.duration / (1000 * 60 * 60 * 24));
  if (intervalIsDaily && schedule.rRule.interval && durationInDays >= schedule.rRule.interval) {
    return 'Recurrence interval must be longer than the snooze duration';
  }
};
