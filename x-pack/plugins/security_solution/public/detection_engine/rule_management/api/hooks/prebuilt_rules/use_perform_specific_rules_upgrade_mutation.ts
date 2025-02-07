/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  PerformRuleUpgradeResponseBody,
  PickVersionValues,
  UpgradeSpecificRulesRequest,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { PERFORM_RULE_UPGRADE_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import { performUpgradeSpecificRules } from '../../api';
import { useInvalidateFetchCoverageOverviewQuery } from '../use_fetch_coverage_overview_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../use_fetch_rule_management_filters_query';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../use_fetch_rules_snooze_settings_query';
import { useInvalidateFindRulesQuery } from '../use_find_rules_query';
import { prebuiltRulesMutationRetry } from './prebuilt_rules_mutation_retry';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchPrebuiltRulesUpgradeReviewQuery } from './use_fetch_prebuilt_rules_upgrade_review_query';

export const PERFORM_SPECIFIC_RULES_UPGRADE_KEY = [
  'POST',
  'SPECIFIC_RULES',
  PERFORM_RULE_UPGRADE_URL,
];

export const usePerformSpecificRulesUpgradeMutation = (
  pickVersion: PickVersionValues,
  options?: UseMutationOptions<
    PerformRuleUpgradeResponseBody,
    unknown,
    UpgradeSpecificRulesRequest['rules']
  >
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRulesSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRulesUpgradeReview =
    useInvalidateFetchPrebuiltRulesUpgradeReviewQuery();
  const invalidateRuleStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchCoverageOverviewQuery = useInvalidateFetchCoverageOverviewQuery();

  return useMutation<PerformRuleUpgradeResponseBody, Error, UpgradeSpecificRulesRequest['rules']>(
    (rulesToUpgrade: UpgradeSpecificRulesRequest['rules']) => {
      return performUpgradeSpecificRules(rulesToUpgrade, pickVersion);
    },
    {
      ...options,
      mutationKey: PERFORM_SPECIFIC_RULES_UPGRADE_KEY,
      onSuccess: (...args) => {
        invalidatePrePackagedRulesStatus();
        invalidateFindRulesQuery();
        invalidateFetchRulesSnoozeSettings();
        invalidateFetchRuleManagementFilters();

        invalidateFetchPrebuiltRulesUpgradeReview();
        invalidateRuleStatus();
        invalidateFetchCoverageOverviewQuery();

        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
      retry: prebuiltRulesMutationRetry,
    }
  );
};
