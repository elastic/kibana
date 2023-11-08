/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import type { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../common/detection_engine/constants';
import type { InstallFleetPackageProps } from '../api';
import { installFleetPackage } from '../api';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_install_review_query';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchPrebuiltRulesUpgradeReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_upgrade_review_query';

export const INSTALL_FLEET_PACKAGE_MUTATION_KEY = [
  'POST',
  EPM_API_ROUTES.INSTALL_FROM_REGISTRY_PATTERN,
];

export const useInstallFleetPackageMutation = (
  options?: UseMutationOptions<InstallPackageResponse, Error, InstallFleetPackageProps>
) => {
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidatePrebuiltRulesInstallReview = useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidatePrebuiltRulesUpdateReview = useInvalidateFetchPrebuiltRulesUpgradeReviewQuery();

  return useMutation((props: InstallFleetPackageProps) => installFleetPackage(props), {
    ...options,
    mutationKey: INSTALL_FLEET_PACKAGE_MUTATION_KEY,
    onSettled: (...args) => {
      const { packageName } = args[2];
      if (packageName === PREBUILT_RULES_PACKAGE_NAME) {
        // Invalidate the pre-packaged rules status query as there might be new rules to install
        invalidatePrePackagedRulesStatus();
        invalidatePrebuiltRulesInstallReview();
        invalidatePrebuiltRulesUpdateReview();
      }

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
