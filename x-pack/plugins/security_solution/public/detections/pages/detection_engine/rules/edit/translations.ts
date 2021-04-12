/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.editRule.pageTitle',
  {
    defaultMessage: 'Edit rule settings',
  }
);

export const CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.editRule.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const SAVE_CHANGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.editRule.saveChangeTitle',
  {
    defaultMessage: 'Save changes',
  }
);

export const SORRY_ERRORS = i18n.translate(
  'xpack.securitySolution.detectionEngine.editRule.errorMsgDescription',
  {
    defaultMessage: 'Sorry',
  }
);

export const BACK_TO = i18n.translate(
  'xpack.securitySolution.detectionEngine.editRule.backToDescription',
  {
    defaultMessage: 'Back to',
  }
);

export const SUCCESSFULLY_SAVED_RULE = (ruleName: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.update.successfullySavedRuleTitle', {
    values: { ruleName },
    defaultMessage: '{ruleName} was saved',
  });
