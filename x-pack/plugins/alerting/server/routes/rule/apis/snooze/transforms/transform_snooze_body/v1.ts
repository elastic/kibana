/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SnoozeOptions } from '../../../../../../rules_client';

export const transformSnoozeBody: (opts: {
  snooze_schedule: SnoozeOptions['snoozeSchedule'];
}) => SnoozeOptions = ({ snooze_schedule: snoozeSchedule }) => ({
  snoozeSchedule,
});
