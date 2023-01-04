/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import type {
  RuleCreateProps,
  RuleResponse,
} from '../../../../../common/detection_engine/rule_schema';
import { transformOutput } from '../../../../detections/containers/detection_engine/rules/transforms';
import { createRule } from '../api';
import { useInvalidateFetchRuleManagementFiltersQuery } from './use_fetch_rule_management_filters_query';
import { useInvalidateFindRulesQuery } from './use_find_rules_query';

export const CREATE_RULE_MUTATION_KEY = ['POST', DETECTION_ENGINE_RULES_URL];

export const useCreateRuleMutation = (
  options?: UseMutationOptions<RuleResponse, Error, RuleCreateProps>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();

  return useMutation<RuleResponse, Error, RuleCreateProps>(
    (rule: RuleCreateProps) => createRule({ rule: transformOutput(rule) }),
    {
      ...options,
      mutationKey: CREATE_RULE_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateFindRulesQuery();
        invalidateFetchRuleManagementFilters();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
