/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import type {
  BulkScheduleBackfillActionResponse,
  ScheduleBackfillBulkAction,
} from '../../../../rule_management/logic';
import { performBulkScheduleBackfillAction } from '../../../../rule_management/logic';
import { processDryRunResult } from './utils/dry_run_result';

import type { DryRunResult } from './types';

const BULK_ACTIONS_DRY_RUN_QUERY_KEY = 'bulkActionsDryRun';

export type ExecuteBulkBulkScheduleBackfillActionsDryRun = UseMutateAsyncFunction<
  DryRunResult | undefined,
  unknown,
  ScheduleBackfillBulkAction
>;

export type UseBulkBulkScheduleBackfillActionsDryRun = () => {
  bulkScheduleBackfillActionsDryRunResult?: DryRunResult;
  isBulkScheduleBackfillActionsDryRunLoading: boolean;
  executeBulkBulkScheduleBackfillActionsDryRun: ExecuteBulkBulkScheduleBackfillActionsDryRun;
};

export const useBulkScheduleBackfillActionDryRun: UseBulkBulkScheduleBackfillActionsDryRun = () => {
  const { data, mutateAsync, isLoading } = useMutation<
    DryRunResult | undefined,
    unknown,
    ScheduleBackfillBulkAction
  >([BULK_ACTIONS_DRY_RUN_QUERY_KEY], async (bulkAction) => {
    let result: BulkScheduleBackfillActionResponse;

    try {
      result = await performBulkScheduleBackfillAction({ bulkAction, dryRun: true });
    } catch (err) {
      // if body doesn't have summary data, action failed altogether and no data available for dry run
      if (
        (err.body as BulkScheduleBackfillActionResponse)?.attributes?.summary?.total === undefined
      ) {
        return;
      }
      result = err.body;
    }

    return processDryRunResult(result);
  });

  return {
    bulkScheduleBackfillActionsDryRunResult: data,
    isBulkScheduleBackfillActionsDryRunLoading: isLoading,
    executeBulkBulkScheduleBackfillActionsDryRun: mutateAsync,
  };
};
