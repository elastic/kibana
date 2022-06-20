/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, QueryClient } from 'react-query';

import {
  BulkAction,
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

import {
  performBulkAction,
  BulkActionResponse,
} from '../../../../../containers/detection_engine/rules';
import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';

const BULK_ACTIONS_DRY_RUN_QUERY_KEY = 'bulkActionsDryRun';

export const getBulkActionsDryRunFromCache = (queryClient: QueryClient) =>
  processDryRunResult(queryClient.getQueryData<BulkActionResponse>(BULK_ACTIONS_DRY_RUN_QUERY_KEY));

const computeDryRunPayload = (
  action: BulkAction,
  editAction?: BulkActionEditType
): BulkActionEditPayload[] | undefined => {
  if (action !== BulkAction.edit || !editAction) {
    return undefined;
  }

  return [
    {
      type: editAction,
      value: [] as any,
    },
  ];
};

export interface DryRunResult {
  summary?: BulkActionResponse['attributes']['summary'];
  failed: Array<{
    message: string;
    ruleIds: string[];
  }>;
}

const processDryRunResult = (result: BulkActionResponse | undefined): DryRunResult => {
  const processed = {
    // all rules that can be edited are succeeded, they also are custom
    summary: result?.attributes.summary,
    failed:
      result?.attributes.errors?.map(({ message, rules }) => ({
        message,
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
