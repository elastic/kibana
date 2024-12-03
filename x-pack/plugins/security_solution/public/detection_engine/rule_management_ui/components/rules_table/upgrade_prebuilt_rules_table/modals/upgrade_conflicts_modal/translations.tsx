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
    defaultMessage: 'Update rules without conflicts?',
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
    defaultMessage: 'Update rules without conflicts',
  }
);

export const UPGRADE_CONFLICTS_MODAL_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.affectedJobsTitle',
  {
    defaultMessage:
      "Some of the selected rules have conflicts and, for that reason, won't be updated. Resolve the conflicts to properly update the rules.",
  }
);
