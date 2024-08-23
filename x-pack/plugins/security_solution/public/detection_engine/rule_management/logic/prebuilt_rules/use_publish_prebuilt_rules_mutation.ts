/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  PublishPrebuiltRulesRequestBody,
  PublishPrebuiltRulesResponse,
} from '../../../../../common/api/detection_engine/prebuilt_rules/publish_prebuilt_rules/publish_prebuilt_rules.gen';
import { useInvalidateFindRulesQuery } from '../../api/hooks/use_find_rules_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../../api/hooks/use_fetch_rule_management_filters_query';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../../api/hooks/use_fetch_rules_snooze_settings_query';
import { publishPrebuiltRules } from '../../api/api';

export const PUBLISH_PREBUILT_RULES_KEY = ['POST', 'PUBLISH_PREBUILT_RULES'];

export const usePublishPrebuiltRulesMutation = (
  options?: UseMutationOptions<PublishPrebuiltRulesResponse, Error, PublishPrebuiltRulesRequestBody>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRulesSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();

  return useMutation<PublishPrebuiltRulesResponse, Error, PublishPrebuiltRulesRequestBody>(
    (requestBody) => publishPrebuiltRules(requestBody),
    {
      ...options,
      mutationKey: PUBLISH_PREBUILT_RULES_KEY,
      onSettled: (...args) => {
        invalidateFindRulesQuery();
        invalidateFetchRulesSnoozeSettings();
        invalidateFetchRuleManagementFilters();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
