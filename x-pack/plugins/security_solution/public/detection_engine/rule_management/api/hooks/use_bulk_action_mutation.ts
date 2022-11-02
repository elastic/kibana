/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import type { BulkActionResponse, PerformBulkActionProps } from '../api';
import { performBulkAction } from '../api';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFindRulesQuery, useUpdateRulesCache } from './use_find_rules_query';
import { useInvalidateFetchTagsQuery } from './use_fetch_tags_query';
import { useInvalidateFetchRuleByIdQuery } from './use_fetch_rule_by_id_query';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';

export const BULK_ACTION_MUTATION_KEY = ['POST', DETECTION_ENGINE_RULES_BULK_ACTION];

export const useBulkActionMutation = (
  options?: UseMutationOptions<BulkActionResponse, Error, PerformBulkActionProps>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();
  const invalidateFetchTagsQuery = useInvalidateFetchTagsQuery();
  const invalidateFetchPrebuiltRulesStatusQuery = useInvalidateFetchPrebuiltRulesStatusQuery();
  const updateRulesCache = useUpdateRulesCache();

  return useMutation<BulkActionResponse, Error, PerformBulkActionProps>(
    (bulkActionProps: PerformBulkActionProps) => performBulkAction(bulkActionProps),
    {
      ...options,
      mutationKey: BULK_ACTION_MUTATION_KEY,
      onSuccess: (...args) => {
        const [
          res,
          {
            bulkAction: { type: actionType },
          },
        ] = args;
        switch (actionType) {
          case BulkActionType.enable:
          case BulkActionType.disable: {
            invalidateFetchRuleByIdQuery();
            // This action doesn't affect rule content, no need for invalidation
            updateRulesCache(res?.attributes?.results?.updated ?? []);
            break;
          }
          case BulkActionType.delete:
            invalidateFindRulesQuery();
            invalidateFetchRuleByIdQuery();
            invalidateFetchTagsQuery();
            invalidateFetchPrebuiltRulesStatusQuery();
            break;
          case BulkActionType.duplicate:
            invalidateFindRulesQuery();
            invalidateFetchPrebuiltRulesStatusQuery();
            break;
          case BulkActionType.edit:
            updateRulesCache(res?.attributes?.results?.updated ?? []);
            invalidateFetchRuleByIdQuery();
            invalidateFetchTagsQuery();
            break;
        }

        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
    }
  );
};
