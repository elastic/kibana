/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.pageTitle',
  {
    defaultMessage: 'Create new rule',
  }
);

export const BACK_TO_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.backToRulesButton',
  {
    defaultMessage: 'Rules',
  }
);

export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const EDIT_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.editRuleButton',
  {
    defaultMessage: 'Edit',
  }
);

export const SUCCESSFULLY_CREATED_RULES = (ruleName: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.create.successfullyCreatedRuleTitle',
    {
      values: { ruleName },
      defaultMessage: '{ruleName} was created',
    }
  );

export const COMPLETE_WITHOUT_ENABLING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.completeWithoutEnablingTitle',
  {
    defaultMessage: 'Create rule without enabling it',
  }
);

export const COMPLETE_WITH_ENABLING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.completeWithEnablingTitle',
  {
    defaultMessage: 'Create & enable rule',
  }
);
