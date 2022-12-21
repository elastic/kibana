/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleSnooze } from '../../types';
import { getRuleSnoozeEndTime } from '../../lib';

export function calculateIsSnoozedUntil(rule: {
  muteAll: boolean;
  snoozeSchedule?: RuleSnooze;
}): string | null {
  const isSnoozedUntil = getRuleSnoozeEndTime(rule);
  return isSnoozedUntil ? isSnoozedUntil.toISOString() : null;
}
