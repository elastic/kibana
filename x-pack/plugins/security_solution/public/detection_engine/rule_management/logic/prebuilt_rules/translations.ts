/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FAILED_ALL_RULES_INSTALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.failedAllRulesInstall',
  {
    defaultMessage: 'Failed to install Elastic prebuilt rules',
  }
);

export const FAILED_SPECIFIC_RULES_INSTALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.failedSepecifcRulesInstall',
  {
    defaultMessage: 'Failed to install selected Elastic prebuilt rules',
  }
);

export const INSTALL_RULE_SUCCESS = (succeeded: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.installRuleSuccess', {
    defaultMessage: '{succeeded, plural, one {rule} other {rules}} installed successfully. ',
    values: { succeeded },
  });

export const INSTALL_RULE_SKIPPED = (skipped: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.installRuleSkipped', {
    defaultMessage: '{skipped, plural, one {rule} other {rules}} skipped installation. ',
    values: { skipped },
  });

export const INSTALL_RULE_FAILED = (failed: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.installRuleFailed', {
    defaultMessage: '{failed, plural, one {rule} other {rules}} failed installation. ',
    values: { failed },
  });

export const FAILED_ALL_RULES_UPGRADE = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.failedAllRulesUpgrade',
  {
    defaultMessage: 'Failed to upgrade Elastic prebuilt rules',
  }
);

export const FAILED_SPECIFIC_RULES_UPGRADE = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.failedSpecificRulesUpgrade',
  {
    defaultMessage: 'Failed to upgrade selected Elastic prebuilt rules',
  }
);

export const UPGRADE_RULE_SUCCESS = (succeeded: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.upgradeRuleSuccess', {
    defaultMessage: '{succeeded, plural, one {rule} other {rules}} update successfully. ',
    values: { succeeded },
  });

export const UPGRADE_RULE_SKIPPED = (skipped: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.upgradeRuleSkipped', {
    defaultMessage: '{skipped, plural, one {rule} other {rules}} skipped update. ',
    values: { skipped },
  });

export const UPGRADE_RULE_FAILED = (failed: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.upgradeRuleFailed', {
    defaultMessage: '{failed, plural, one {rule} other {rules}} failed update. ',
    values: { failed },
  });
