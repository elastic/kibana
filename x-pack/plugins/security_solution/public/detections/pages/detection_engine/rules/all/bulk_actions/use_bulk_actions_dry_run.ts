/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutateAsyncFunction } from 'react-query';
import { useMutation } from 'react-query';

import type { BulkActionsDryRunErrCode } from '../../../../../../../common/constants';

import type {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';
import type { BulkActionResponse } from '../../../../../containers/detection_engine/rules';
import { performBulkAction } from '../../../../../containers/detection_engine/rules';
import { computeDryRunPayload } from './utils/compute_dry_run_payload';

const BULK_ACTIONS_DRY_RUN_QUERY_KEY = 'bulkActionsDryRun';

export interface DryRunResult {
  /**
   * total number of rules that succeeded validation in dry run
   */
  succeededRulesCount?: number;
  /**
   * total number of rules that failed validation in dry run
   */
  failedRulesCount?: number;
  /**
   * rule failures errors(message and error code) and ids of rules, that failed
   */
  ruleErrors: Array<{
    message: string;
    errorCode?: BulkActionsDryRunErrCode;
    ruleIds: string[];
  }>;
}

/**
 * helper utility that transforms raw BulkActionResponse response to DryRunResult format
 * @param response - raw bulk_actions API response ({@link BulkActionResponse})
 * @returns dry run result ({@link DryRunResult})
 */
const processDryRunResult = (response: BulkActionResponse | undefined): DryRunResult => {
  const processed = {
    succeededRulesCount: response?.attributes.summary.succeeded,
    failedRulesCount: response?.attributes.summary.failed,
    ruleErrors:
      response?.attributes.errors?.map(({ message, err_code: errorCode, rules }) => ({
        message,
        errorCode,
        ruleIds: rules.map(({ id }) => id),
      })) ?? [],
  };

  return processed;
};

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
