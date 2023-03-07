/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import type { BulkActionErrorResponse, BulkActionResponse, PerformBulkActionProps } from '../api';
import { performBulkAction } from '../api';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFindRulesQuery, useUpdateRulesCache } from './use_find_rules_query';
import { useInvalidateFetchRuleByIdQuery } from './use_fetch_rule_by_id_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from './use_fetch_rule_management_filters_query';

export const BULK_ACTION_MUTATION_KEY = ['POST', DETECTION_ENGINE_RULES_BULK_ACTION];

export const useBulkActionMutation = (
  options?: UseMutationOptions<
    BulkActionResponse,
    IHttpFetchError<BulkActionErrorResponse>,
    PerformBulkActionProps
  >
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRulesStatusQuery = useInvalidateFetchPrebuiltRulesStatusQuery();
  const updateRulesCache = useUpdateRulesCache();

  return useMutation<
    BulkActionResponse,
    IHttpFetchError<BulkActionErrorResponse>,
    PerformBulkActionProps
  >((bulkActionProps: PerformBulkActionProps) => performBulkAction(bulkActionProps), {
    ...options,
    mutationKey: BULK_ACTION_MUTATION_KEY,
    onSettled: (...args) => {
      const [
        response,
        error,
        {
          bulkAction: { type: actionType },
        },
      ] = args;

      const updatedRules =
        response?.attributes?.results?.updated ?? error?.body?.attributes?.results?.updated;

      switch (actionType) {
        case BulkActionType.enable:
        case BulkActionType.disable: {
          invalidateFetchRuleByIdQuery();
          if (updatedRules) {
            // We have a list of updated rules, no need to invalidate all
            updateRulesCache(updatedRules);
          } else {
            // We failed to receive the list of update rules, invalidate all
            invalidateFindRulesQuery();
          }
          break;
        }
        case BulkActionType.delete:
          invalidateFindRulesQuery();
          invalidateFetchRuleByIdQuery();
          invalidateFetchRuleManagementFilters();
          invalidateFetchPrebuiltRulesStatusQuery();
          break;
        case BulkActionType.duplicate:
          invalidateFindRulesQuery();
          invalidateFetchRuleManagementFilters();
          break;
        case BulkActionType.edit:
          if (updatedRules) {
            // We have a list of updated rules, no need to invalidate all
            updateRulesCache(updatedRules);
          } else {
            // We failed to receive the list of update rules, invalidate all
            invalidateFindRulesQuery();
          }
          invalidateFetchRuleByIdQuery();
          invalidateFetchRuleManagementFilters();
          break;
      }

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
