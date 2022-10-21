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
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFindRulesQuery } from './use_find_rules_query';
import { useInvalidateFetchTagsQuery } from './use_fetch_tags_query';

export const useCreatePrebuiltRulesMutation = (
  options?: UseMutationOptions<CreatePrepackagedRulesResponse>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchTagsQuery = useInvalidateFetchTagsQuery();

  return useMutation(() => createPrepackagedRules(), {
    ...options,
    onSuccess: (...args) => {
      // Always invalidate all rules and the prepackaged rules status cache as
      // the number of rules might change after the installation
      invalidatePrePackagedRulesStatus();
      invalidateFindRulesQuery();
      invalidateFetchTagsQuery();

      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
