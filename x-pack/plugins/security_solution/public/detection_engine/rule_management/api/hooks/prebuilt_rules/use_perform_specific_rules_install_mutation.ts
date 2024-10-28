/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  InstallSpecificRulesRequest,
  PerformRuleInstallationResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { PERFORM_RULE_INSTALLATION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFindRulesQuery } from '../use_find_rules_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../use_fetch_rule_management_filters_query';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../use_fetch_rules_snooze_settings_query';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './use_fetch_prebuilt_rules_install_review_query';
import type { BulkAction } from '../../api';
import { performInstallSpecificRules } from '../../api';
import { useInvalidateFetchCoverageOverviewQuery } from '../use_fetch_coverage_overview_query';
import { useBulkActionMutation } from '../use_bulk_action_mutation';

export const PERFORM_SPECIFIC_RULES_INSTALLATION_KEY = [
  'POST',
  'SPECIFIC_RULES',
  PERFORM_RULE_INSTALLATION_URL,
];

export interface UsePerformSpecificRulesInstallParams {
  rules: InstallSpecificRulesRequest['rules'];
  enable?: boolean;
}

export const usePerformSpecificRulesInstallMutation = (
  options?: UseMutationOptions<
    PerformRuleInstallationResponseBody,
    Error,
    UsePerformSpecificRulesInstallParams
  >
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRulesSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRulesInstallReview =
    useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidateRuleStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchCoverageOverviewQuery = useInvalidateFetchCoverageOverviewQuery();
  const { mutateAsync } = useBulkActionMutation();

  return useMutation<
    PerformRuleInstallationResponseBody,
    Error,
    UsePerformSpecificRulesInstallParams
  >(
    (rulesToInstall: UsePerformSpecificRulesInstallParams) =>
      performInstallSpecificRules(rulesToInstall.rules),
    {
      ...options,
      mutationKey: PERFORM_SPECIFIC_RULES_INSTALLATION_KEY,
      onSettled: (...args) => {
        invalidatePrePackagedRulesStatus();
        invalidateFindRulesQuery();
        invalidateFetchRulesSnoozeSettings();
        invalidateFetchRuleManagementFilters();

        invalidateFetchPrebuiltRulesInstallReview();
        invalidateRuleStatus();
        invalidateFetchCoverageOverviewQuery();

        const [response, , { enable }] = args;

        if (response && enable) {
          const ruleIdsToEnable = response.results.created.map((rule) => rule.id);
          const bulkAction: BulkAction = { type: 'enable', ids: ruleIdsToEnable };
          mutateAsync({ bulkAction });
        }

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
