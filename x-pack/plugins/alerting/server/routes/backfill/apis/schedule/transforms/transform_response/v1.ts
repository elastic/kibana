/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Backfill } from '../../../../../../application/backfill/result/types';
import type {
  ScheduleBackfillError,
  ScheduleBackfillResult,
  ScheduleBackfillResults,
} from '../../../../../../application/backfill/methods/schedule/types';
import { ScheduleBackfillResponseBodyV1 } from '../../../../../../../common/routes/backfill/apis/schedule';

export const transformResponse = (
  results: ScheduleBackfillResults
): ScheduleBackfillResponseBodyV1 => {
  return results.map((result: ScheduleBackfillResult) => {
    if ((result as ScheduleBackfillError)?.error) {
      return result as ScheduleBackfillError;
    }

    const backfillResult = result as Backfill;
    const { createdAt, rule, spaceId, schedule, ...rest } = backfillResult;

    const {
      alertTypeId,
      apiKeyOwner,
      apiKeyCreatedByUser,
      createdBy,
      createdAt: ruleCreatedAt,
      updatedBy,
      updatedAt,
      ...restRule
    } = rule;
    return {
      ...rest,
      created_at: createdAt,
      space_id: spaceId,
      rule: {
        ...restRule,
        rule_type_id: alertTypeId,
        api_key_owner: apiKeyOwner,
        api_key_created_by_user: apiKeyCreatedByUser,
        created_by: createdBy,
        created_at: ruleCreatedAt,
        updated_by: updatedBy,
        updated_at: updatedAt,
      },
      schedule: schedule.map(({ runAt, status, interval }) => ({
        run_at: runAt,
        status,
        interval,
      })),
    };
  });
};
