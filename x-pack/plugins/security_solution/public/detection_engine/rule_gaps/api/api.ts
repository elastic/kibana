/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_ALERTING_BACKFILL_API_PATH,
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
  INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
} from '@kbn/alerting-plugin/common';
import type { FindBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/find';
import type { ScheduleBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/schedule';
import { KibanaServices } from '../../../common/lib/kibana';
import type { ScheduleBackfillProps } from '../types';

/**
 * Schedule rules run over a specified time range
 *
 * @param ruleIds `rule_id`s of each rule to be backfilled
 * @param timeRange the time range over which the backfill should apply
 *
 * @throws An error if response is not OK
 */
export const scheduleRuleRun = async ({
  ruleIds,
  timeRange,
}: ScheduleBackfillProps): Promise<ScheduleBackfillResponseBody> => {
  const params = ruleIds.map((ruleId) => {
    return {
      rule_id: ruleId,
      start: timeRange.startDate.toISOString(),
      end: timeRange.endDate.toISOString(),
    };
  });
  return KibanaServices.get().http.fetch<ScheduleBackfillResponseBody>(
    INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
    {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify(params),
    }
  );
};

/**
 * Find backfills for the given rule IDs
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const findBackfillsForRules = async ({
  ruleIds,
  page,
  perPage,
  signal,
  sortField = 'createdAt',
  sortOrder = 'desc',
}: {
  ruleIds: string[];
  page: number;
  perPage: number;
  signal?: AbortSignal;
  sortField?: string;
  sortOrder?: string;
}): Promise<FindBackfillResponseBody> =>
  KibanaServices.get().http.fetch<FindBackfillResponseBody>(
    INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
    {
      method: 'POST',
      query: {
        rule_ids: ruleIds.join(','),
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      signal,
    }
  );

/**
 * Delete backfill by ID
 * @param backfillId
 * @returns
 */
export const deleteBackfill = async ({ backfillId }: { backfillId: string }) => {
  return KibanaServices.get().http.fetch<FindBackfillResponseBody>(
    `${INTERNAL_ALERTING_BACKFILL_API_PATH}/${backfillId}`,
    {
      method: 'DELETE',
    }
  );
};
