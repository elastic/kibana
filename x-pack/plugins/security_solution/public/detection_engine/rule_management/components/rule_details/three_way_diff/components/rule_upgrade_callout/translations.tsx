/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_HAS_NON_SOLVABLE_CONFLICTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasNonSolvableConflicts',
    {
      values: { count },
      defaultMessage:
        '{count} of the fields {count, plural, one {has} other {have}} an unsolved conflict. Please review and modify accordingly.',
    }
  );

export const RULE_HAS_NON_SOLVABLE_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasNonSolvableConflictsDescription',
  {
    defaultMessage:
      'Please provide an input for the unsolved conflict. You can also keep the current without the updates, or accept the Elastic update but lose your modifications.',
  }
);

export const RULE_HAS_SOLVABLE_CONFLICTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSolvableConflicts',
    {
      values: { count },
      defaultMessage:
        '{count} of the fields {count, plural, one {has} other {have}} an update conflict, please review the suggested update being updating.',
    }
  );

export const RULE_HAS_SOLVABLE_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSolvableConflictsDescription',
  {
    defaultMessage:
      'Please review the suggested updated version before accepting the update. You can edit and then save the field if you wish to change it.',
  }
);

export const RULE_IS_READY_FOR_UPGRADE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleIsReadyForUpgrade',
  {
    defaultMessage: 'The update is ready to be applied.',
  }
);

export const RULE_IS_READY_FOR_UPGRADE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleIsReadyForUpgradeDescription',
  {
    defaultMessage: 'All conflicts have now been reviewed and solved please update the rule.',
  }
);
