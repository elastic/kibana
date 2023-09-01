/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSnoozeSchedule } from '../../../../../../application/rule/types';

export const transformSnoozeBody: (opts: { snooze_schedule: RuleSnoozeSchedule }) => {
  snoozeSchedule: RuleSnoozeSchedule;
} = ({ snooze_schedule: snoozeSchedule }) => ({
  snoozeSchedule,
});
