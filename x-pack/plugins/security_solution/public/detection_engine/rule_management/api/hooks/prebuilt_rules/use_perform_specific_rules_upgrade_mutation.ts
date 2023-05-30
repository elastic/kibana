/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { PerformRuleUpgradeResponseBody } from '../../../../../../common/detection_engine/prebuilt_rules/api/perform_rule_upgrade/perform_rule_upgrade_response_schema';
import { PERFORM_RULE_UPGRADE_URL } from '../../../../../../common/detection_engine/prebuilt_rules/api/urls';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from '../use_fetch_prebuilt_rules_status_query';
import { useInvalidateFindRulesQuery } from '../use_find_rules_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../use_fetch_rule_management_filters_query';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../use_fetch_rules_snooze_settings';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './use_fetch_prebuilt_rules_install_review_query';
import type { UpgradeSpecificRulesRequest } from '../../../../../../common/detection_engine/prebuilt_rules/api/perform_rule_upgrade/perform_rule_upgrade_request_schema';
import { performUpgradeSpecificRules } from '../../api';
import { useInvalidateFetchPrebuiltRulesStatusQueryNew } from './use_fetch_prebuilt_rules_status_query_new';

export const PERFORM_SPECIFIC_RULES_UPGRADE_KEY = [
  'POST',
  'SPECIFIC_RULES',
  PERFORM_RULE_UPGRADE_URL,
];

export const usePerformSpecificRulesUpgradeMutation = (
  options?: UseMutationOptions<
    PerformRuleUpgradeResponseBody,
    Error,
    UpgradeSpecificRulesRequest['rules']
  >
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRulesSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRulesInstallReview =
    useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidateRuleStatus = useInvalidateFetchPrebuiltRulesStatusQueryNew();

  return useMutation<PerformRuleUpgradeResponseBody, Error, UpgradeSpecificRulesRequest['rules']>(
    (rulesToInstall: UpgradeSpecificRulesRequest['rules']) => {
      return performUpgradeSpecificRules(rulesToInstall);
    },
    {
      ...options,
      mutationKey: PERFORM_SPECIFIC_RULES_UPGRADE_KEY,
      onSettled: (...args) => {
        invalidatePrePackagedRulesStatus();
        invalidateFindRulesQuery();
        invalidateFetchRulesSnoozeSettings();
        invalidateFetchRuleManagementFilters();

        invalidateFetchPrebuiltRulesInstallReview();
        invalidateRuleStatus();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
