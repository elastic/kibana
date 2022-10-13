/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { BulkAction } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type { BulkActionProps, BulkActionResponse } from '../api';
import { performBulkAction } from '../api';
import { useInvalidatePrebuiltRulesStatus } from './use_prebuilt_rules_status_query';
import { useInvalidateRules, useUpdateRulesCache } from './use_rules_query';
import { useInvalidateTags } from './use_tags_query';

export const useBulkActionMutation = (
  options?: UseMutationOptions<BulkActionResponse, Error, BulkActionProps>
) => {
  const invalidateRules = useInvalidateRules();
  const invalidateTags = useInvalidateTags();
  const invalidatePrebuiltRulesStatus = useInvalidatePrebuiltRulesStatus();
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
            // This action doesn't affect rule content, no need for invalidation
            updateRulesCache(res?.attributes?.results?.updated ?? []);
            break;
          }
          case BulkAction.delete:
            invalidateRules();
            invalidateTags();
            invalidatePrebuiltRulesStatus();
            break;
          case BulkAction.duplicate:
            invalidateRules();
            invalidatePrebuiltRulesStatus();
            break;
          case BulkAction.edit:
            updateRulesCache(res?.attributes?.results?.updated ?? []);
            invalidateTags();
            break;
        }

        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
    }
  );
};
