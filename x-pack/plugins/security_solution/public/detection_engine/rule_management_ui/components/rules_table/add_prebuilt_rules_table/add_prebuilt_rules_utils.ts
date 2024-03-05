/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRulesStatusStats } from '../../../../../../common/api/detection_engine';

interface UpgradeReviewEnabledProps {
  canUserCRUD: boolean | null;
  isUpgradingSecurityPackages: boolean;
  prebuiltRulesStatus?: PrebuiltRulesStatusStats;
}

export const isUpgradeReviewRequestEnabled = ({
  canUserCRUD,
  isUpgradingSecurityPackages,
  prebuiltRulesStatus,
}: UpgradeReviewEnabledProps) => {
  // Wait until security package is updated
  if (isUpgradingSecurityPackages) {
    return false;
  }

  // If user is read-only, allow request to proceed even though the Prebuilt
  // Rules might not be installed. For these users, the Fleet endpoint quickly
  // fails with 403 so isUpgradingSecurityPackages is false
  if (canUserCRUD === false) {
    return true;
  }

  return prebuiltRulesStatus && prebuiltRulesStatus.num_prebuilt_rules_total_in_package > 0;
};
