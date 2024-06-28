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
import { transformBackfillToBackfillResponseV1 } from '../../../../transforms';

export const transformResponse = (
  results: ScheduleBackfillResults
): ScheduleBackfillResponseBodyV1 => {
  return results.map((result: ScheduleBackfillResult) => {
    if ((result as ScheduleBackfillError)?.error) {
      return result as ScheduleBackfillError;
    }

    return transformBackfillToBackfillResponseV1(result as Backfill);
  });
};
