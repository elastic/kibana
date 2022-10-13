/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import type {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type { BulkActionResponse } from '../../../../rule_management/logic';
import { performBulkAction } from '../../../../rule_management/logic';
import { computeDryRunPayload } from './utils/compute_dry_run_payload';
import { processDryRunResult } from './utils/dry_run_result';

import type { DryRunResult } from './types';

const BULK_ACTIONS_DRY_RUN_QUERY_KEY = 'bulkActionsDryRun';

export type ExecuteBulkActionsDryRun = UseMutateAsyncFunction<
  DryRunResult | undefined,
  unknown,
  BulkActionsDryRunVariables
>;

export type UseBulkActionsDryRun = () => {
  bulkActionsDryRunResult?: DryRunResult;
  isBulkActionsDryRunLoading: boolean;
  executeBulkActionsDryRun: ExecuteBulkActionsDryRun;
};

interface BulkActionsDryRunVariables {
  action?: Exclude<BulkAction, BulkAction.export>;
  editAction?: BulkActionEditType;
  searchParams: { query?: string } | { ids?: string[] };
}

export const useBulkActionsDryRun: UseBulkActionsDryRun = () => {
  const { data, mutateAsync, isLoading } = useMutation<
    DryRunResult | undefined,
    unknown,
    BulkActionsDryRunVariables
  >([BULK_ACTIONS_DRY_RUN_QUERY_KEY], async ({ searchParams, action, editAction }) => {
    if (!action) {
      return undefined;
    }

    let result: BulkActionResponse;
    try {
      result = await performBulkAction({
        ...searchParams,
        action,
        edit: computeDryRunPayload(action, editAction),
        isDryRun: true,
      });
    } catch (err) {
      // if body doesn't have summary data, action failed altogether and no data available for dry run
      if ((err.body as BulkActionResponse)?.attributes?.summary?.total === undefined) {
        return;
      }
      result = err.body;
    }

    return processDryRunResult(result);
  });

  return {
    bulkActionsDryRunResult: data,
    isBulkActionsDryRunLoading: isLoading,
    executeBulkActionsDryRun: mutateAsync,
  };
};
