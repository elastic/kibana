/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_CONFLICTS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.messageTitle',
  {
    defaultMessage: 'Rule with conflicts will not be updated',
  }
);

export const UPGRADE_CONFLICTS_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const UPGRADE_CONFLICTS_MODAL_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.confirmTitle',
  {
    defaultMessage: 'Upgrade rules with no conflicts',
  }
);

export const UPGRADE_CONFLICTS_MODAL_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.affectedJobsTitle',
  {
    defaultMessage:
      'Some of the rules selected have conflicts in one or more of their fields and will not be updated. Please resolve the conflicts on a case-per-case basis.',
  }
);

export const UPGRADE_CONFLICTS_MODAL_AFFECTED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.affectedJobsTitle',
  {
    defaultMessage: 'Affected rules:',
  }
);
