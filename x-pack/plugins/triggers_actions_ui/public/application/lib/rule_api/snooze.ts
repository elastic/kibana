/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { SnoozeSchedule } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

function rewriteSnoozeSchedule({ id, duration, rRule }: SnoozeSchedule) {
  return {
    ...(id ? { id } : {}),
    duration,
    rRule: {
      ...rRule,
      ...(rRule.until ? { until: rRule.until.toISOString() } : {}),
    },
  };
}

export async function snoozeRule({
  id,
  snoozeSchedule,
  http,
}: {
  id: string;
  snoozeSchedule: SnoozeSchedule;
  http: HttpSetup;
}): Promise<void> {
  await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_snooze`, {
    body: JSON.stringify({
      snooze_schedule: rewriteSnoozeSchedule(snoozeSchedule),
    }),
  });
}
