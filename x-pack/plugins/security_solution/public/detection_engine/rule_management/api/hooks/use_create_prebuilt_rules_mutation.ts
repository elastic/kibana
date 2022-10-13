/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { CreatePrepackagedRulesResponse } from '../api';
import { createPrepackagedRules } from '../api';
import { useInvalidatePrebuiltRulesStatus } from './use_prebuilt_rules_status_query';
import { useInvalidateRules } from './use_rules_query';
import { useInvalidateTags } from './use_tags_query';

export const useCreatePrebuiltRulesMutation = (
  options?: UseMutationOptions<CreatePrepackagedRulesResponse>
) => {
  const invalidateRules = useInvalidateRules();
  const invalidatePrePackagedRulesStatus = useInvalidatePrebuiltRulesStatus();
  const invalidateTags = useInvalidateTags();

  return useMutation(() => createPrepackagedRules(), {
    ...options,
    onSuccess: (...args) => {
      // Always invalidate all rules and the prepackaged rules status cache as
      // the number of rules might change after the installation
      invalidatePrePackagedRulesStatus();
      invalidateRules();
      invalidateTags();

      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
