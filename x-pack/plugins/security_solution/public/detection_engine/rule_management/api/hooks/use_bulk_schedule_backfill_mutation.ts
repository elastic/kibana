/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { BulkScheduleBackfillActionResponse } from '../../../../../common/api/detection_engine';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import type {
  BulkScheduleBackfillActionErrorResponse,
  PerformBulkScheduleBackfillActionProps,
} from '../api';
import { performBulkScheduleBackfillAction } from '../api';

export const BULK_ACTION_MUTATION_KEY = ['POST', DETECTION_ENGINE_RULES_BULK_ACTION];

export const useBulkScheduleBackfillMutation = (
  options?: UseMutationOptions<
    BulkScheduleBackfillActionResponse,
    IHttpFetchError<BulkScheduleBackfillActionErrorResponse>,
    PerformBulkScheduleBackfillActionProps
  >
) => {
  return useMutation<
    BulkScheduleBackfillActionResponse,
    IHttpFetchError<BulkScheduleBackfillActionErrorResponse>,
    PerformBulkScheduleBackfillActionProps
  >(
    (bulkActionProps: PerformBulkScheduleBackfillActionProps) =>
      performBulkScheduleBackfillAction(bulkActionProps),
    {
      ...options,
      mutationKey: BULK_ACTION_MUTATION_KEY,
    }
  );
};
