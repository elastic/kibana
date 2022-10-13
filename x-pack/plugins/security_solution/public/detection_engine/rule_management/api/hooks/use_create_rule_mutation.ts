/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  CreateRulesSchema,
  FullResponseSchema,
} from '../../../../../common/detection_engine/schemas/request';
import { transformOutput } from '../../../../detections/containers/detection_engine/rules/transforms';
import { createRule } from '../api';
import { useInvalidatePrebuiltRulesStatus } from './use_prebuilt_rules_status_query';
import { useInvalidateRules } from './use_rules_query';
import { useInvalidateTags } from './use_tags_query';

export const useCreateRuleMutation = (
  options?: UseMutationOptions<FullResponseSchema, Error, CreateRulesSchema>
) => {
  const invalidateRules = useInvalidateRules();
  const invalidateTags = useInvalidateTags();
  const invalidatePrePackagedRulesStatus = useInvalidatePrebuiltRulesStatus();

  return useMutation<FullResponseSchema, Error, CreateRulesSchema>(
    (rule: CreateRulesSchema) => createRule({ rule: transformOutput(rule) }),
    {
      ...options,
      onSuccess: (...args) => {
        invalidatePrePackagedRulesStatus();
        invalidateRules();
        invalidateTags();

        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
    }
  );
};
