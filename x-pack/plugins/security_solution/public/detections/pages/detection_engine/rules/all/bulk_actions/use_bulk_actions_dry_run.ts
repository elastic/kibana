/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, QueryClient } from 'react-query';

import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';
import { BULK_ACTIONS_DRY_RUN_ERR_CODE } from '../../../../../../../common/constants';

import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';
import {
  performBulkAction,
  BulkActionResponse,
} from '../../../../../containers/detection_engine/rules';
import { computeDryRunPayload } from './utils/compute_dry_run_payload';

const BULK_ACTIONS_DRY_RUN_QUERY_KEY = 'bulkActionsDryRun';

export const getBulkActionsDryRunFromCache = (queryClient: QueryClient) =>
  processDryRunResult(queryClient.getQueryData<BulkActionResponse>(BULK_ACTIONS_DRY_RUN_QUERY_KEY));

export interface DryRunResult {
  succeededRulesCount?: number;
  failedRulesCount?: number;
  ruleErrors: Array<{
    message: string;
    errorCode?: BULK_ACTIONS_DRY_RUN_ERR_CODE;
    ruleIds: string[];
  }>;
}

/**
 * helper utility that transforms raw BulkActionResponse response into more usable format
 * @param {BulkActionResponse | undefined} result - raw bulk_actions API response
 * @returns {DryRunResult}
 */
const processDryRunResult = (result: BulkActionResponse | undefined): DryRunResult => {
  const processed = {
    succeededRulesCount: result?.attributes.summary.succeeded,
    failedRulesCount: result?.attributes.summary.failed,
    ruleErrors:
      result?.attributes.errors?.map(({ message, err_code: errorCode, rules }) => ({
        message,
        errorCode,
        ruleIds: rules.map(({ id }) => id),
      })) ?? [],
  };

  return processed;
};

interface UseBulkActionsDryRunProps {
  action?: BulkAction;
  searchParams: { filterOptions?: FilterOptions } | { ids?: string[] };
  enabled: boolean;
  editAction?: BulkActionEditType;
}

type UseBulkActionsDryRun = (props: UseBulkActionsDryRunProps) => {
  bulkActionsDryRunResult?: DryRunResult;
  isBulkActionsDryRunLoading: boolean;
};

export const useBulkActionsDryRun: UseBulkActionsDryRun = ({
  searchParams,
  enabled,
  action,
  editAction,
}) => {
  const { data, isFetching } = useQuery<BulkActionResponse | undefined>(
    [BULK_ACTIONS_DRY_RUN_QUERY_KEY],
    async () => {
      if (!action) {
        return undefined;
      }

      if (action === BulkAction.export) {
        return {
          success: true,
          rules_count: 0,
          attributes: {
            summary: { succeeded: 0, total: 0, failed: 0 },
            results: { updated: [], created: [], deleted: [] },
            errors: [],
          },
        };
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
        result = err.body;
      }

      return result;
    },
    {
      enabled,
    }
  );

  return {
    bulkActionsDryRunResult: processDryRunResult(data),
    isBulkActionsDryRunLoading: isFetching,
  };
};
