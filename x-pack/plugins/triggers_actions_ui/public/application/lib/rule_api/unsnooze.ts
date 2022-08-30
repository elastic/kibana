/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export async function unsnoozeRule({
  id,
  http,
  scheduleIds,
}: {
  id: string;
  http: HttpSetup;
  scheduleIds?: string[];
}): Promise<void> {
  await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_unsnooze`, {
    body: JSON.stringify({
      schedule_ids: scheduleIds,
    }),
  });
}

export async function unsnoozeRules({
  ids,
  http,
  scheduleIds,
}: {
  ids: string[];
  http: HttpSetup;
  scheduleIds?: string[];
}): Promise<void> {
  await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_edit`, {
    body: JSON.stringify({
      ids,
      operations: [
        {
          operation: 'delete',
          field: 'snoozeSchedule',
          value: scheduleIds,
        },
      ],
    }),
  });
}
