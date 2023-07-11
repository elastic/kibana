/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import type { BulkInstallPackagesResponse } from '@kbn/fleet-plugin/common/types';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../common/detection_engine/constants';
import type { BulkInstallFleetPackagesProps } from '../api';
import { bulkInstallFleetPackages } from '../api';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_install_review_query';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchPrebuiltRulesUpgradeReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_upgrade_review_query';

export const BULK_INSTALL_FLEET_PACKAGES_MUTATION_KEY = [
  'POST',
  EPM_API_ROUTES.BULK_INSTALL_PATTERN,
];

export const useBulkInstallFleetPackagesMutation = (
  options?: UseMutationOptions<BulkInstallPackagesResponse, Error, BulkInstallFleetPackagesProps>
) => {
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidatePrebuiltRulesInstallReview = useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidatePrebuiltRulesUpdateReview = useInvalidateFetchPrebuiltRulesUpgradeReviewQuery();

  return useMutation((props: BulkInstallFleetPackagesProps) => bulkInstallFleetPackages(props), {
    ...options,
    mutationKey: BULK_INSTALL_FLEET_PACKAGES_MUTATION_KEY,
    onSettled: (...args) => {
      const response = args[0];
      const rulesPackage = response?.items.find(
        (item) => item.name === PREBUILT_RULES_PACKAGE_NAME
      );
      if (rulesPackage && 'result' in rulesPackage && rulesPackage.result.status === 'installed') {
        // The rules package was installed/updated, so invalidate the pre-packaged rules status query
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
