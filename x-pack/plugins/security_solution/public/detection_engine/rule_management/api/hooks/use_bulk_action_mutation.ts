/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { BulkAction } from '../../../../../common/detection_engine/rule_management';
import type { BulkActionProps, BulkActionResponse } from '../api';
import { performBulkAction } from '../api';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFindRulesQuery, useUpdateRulesCache } from './use_find_rules_query';
import { useInvalidateFetchTagsQuery } from './use_fetch_tags_query';
import { useInvalidateFetchRuleByIdQuery } from './use_fetch_rule_by_id_query';

export const useBulkActionMutation = (
  options?: UseMutationOptions<BulkActionResponse, Error, BulkActionProps>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();
  const invalidateFetchTagsQuery = useInvalidateFetchTagsQuery();
  const invalidateFetchPrebuiltRulesStatusQuery = useInvalidateFetchPrebuiltRulesStatusQuery();
  const updateRulesCache = useUpdateRulesCache();

  return useMutation<BulkActionResponse, Error, BulkActionProps>(
    (action: BulkActionProps) => performBulkAction(action),
    {
      ...options,
      onSuccess: (...args) => {
        const [res, { action }] = args;
        switch (action) {
          case BulkAction.enable:
          case BulkAction.disable: {
            invalidateFetchRuleByIdQuery();
            // This action doesn't affect rule content, no need for invalidation
            updateRulesCache(res?.attributes?.results?.updated ?? []);
            break;
          }
          case BulkAction.delete:
            invalidateFindRulesQuery();
            invalidateFetchRuleByIdQuery();
            invalidateFetchTagsQuery();
            invalidateFetchPrebuiltRulesStatusQuery();
            break;
          case BulkAction.duplicate:
            invalidateFindRulesQuery();
            invalidateFetchPrebuiltRulesStatusQuery();
            break;
          case BulkAction.edit:
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
