/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export async function snoozeRule({
  id,
  snoozeEndTime,
  http,
}: {
  id: string;
  snoozeEndTime: string | -1;
  http: HttpSetup;
}): Promise<void> {
  await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_snooze`, {
    body: JSON.stringify({
      snooze_end_time: snoozeEndTime,
    }),
  });
}
