/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPDATE_ACCEPTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.updateAccepted',
  {
    defaultMessage: 'Update accepted',
  }
);

export const UPDATE_ACCEPTED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.updateAcceptedDescription',
  {
    defaultMessage:
      'You can still make changes, please review/accept all other conflicts before updating the rule.',
  }
);

export const SOLVABLE_CONFLICT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.solvableConflict',
  {
    defaultMessage: 'Solved conflict',
  }
);

export const SOLVABLE_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.solvableConflictDescription',
  {
    defaultMessage:
      'We have suggested an update for this modified field, please review before accepting.',
  }
);

export const NON_SOLVABLE_CONFLICT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.nonSolvableConflict',
  {
    defaultMessage: 'Solved conflict',
  }
);

export const NON_SOLVABLE_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.nonSolvableConflictDescription',
  {
    defaultMessage:
      'We have suggested an update for this modified field, please review before accepting.',
  }
);

export const SEPARATOR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.separator',
  {
    defaultMessage: ' - ',
  }
);
