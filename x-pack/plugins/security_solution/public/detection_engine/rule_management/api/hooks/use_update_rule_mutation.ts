/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  FullResponseSchema,
  UpdateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';
import { transformOutput } from '../../../../detections/containers/detection_engine/rules/transforms';
import { updateRule } from '../api';
import { useInvalidateFindRulesQuery } from './use_find_rules_query';
import { useInvalidateFetchTagsQuery } from './use_fetch_tags_query';
import { useInvalidateFetchRuleByIdQuery } from './use_fetch_rule_by_id_query';

export const useUpdateRuleMutation = (
  options?: UseMutationOptions<FullResponseSchema, Error, UpdateRulesSchema>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchTagsQuery = useInvalidateFetchTagsQuery();
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();

  return useMutation<FullResponseSchema, Error, UpdateRulesSchema>(
    (rule: UpdateRulesSchema) => updateRule({ rule: transformOutput(rule) }),
    {
      ...options,
      onSuccess: (...args) => {
        invalidateFindRulesQuery();
        invalidateFetchRuleByIdQuery();
        invalidateFetchTagsQuery();

        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
    }
  );
};
