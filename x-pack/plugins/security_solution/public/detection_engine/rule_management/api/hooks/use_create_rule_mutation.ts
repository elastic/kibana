/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  RuleCreateProps,
  RuleResponse,
} from '../../../../../common/detection_engine/rule_schema';
import { transformOutput } from '../../../../detections/containers/detection_engine/rules/transforms';
import { createRule } from '../api';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchTagsQuery } from './use_fetch_tags_query';
import { useInvalidateFindRulesQuery } from './use_find_rules_query';

export const useCreateRuleMutation = (
  options?: UseMutationOptions<RuleResponse, Error, RuleCreateProps>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchTagsQuery = useInvalidateFetchTagsQuery();
  const invalidateFetchPrePackagedRulesStatusQuery = useInvalidateFetchPrebuiltRulesStatusQuery();

  return useMutation<RuleResponse, Error, RuleCreateProps>(
    (rule: RuleCreateProps) => createRule({ rule: transformOutput(rule) }),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateFetchPrePackagedRulesStatusQuery();
        invalidateFindRulesQuery();
        invalidateFetchTagsQuery();

        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
    }
  );
};
