/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.siem.detectionEngine.createRule.pageTitle', {
  defaultMessage: 'Create new rule',
});

export const BACK_TO_RULES = i18n.translate(
  'xpack.siem.detectionEngine.createRule.backToRulesDescription',
  {
    defaultMessage: 'Back to signal detection rules',
  }
);

export const EDIT_RULE = i18n.translate('xpack.siem.detectionEngine.createRule.editRuleButton', {
  defaultMessage: 'Edit',
});

export const SUCCESSFULLY_CREATED_RULES = (ruleName: string) =>
  i18n.translate('xpack.siem.detectionEngine.rules.create.successfullyCreatedRuleTitle', {
    values: { ruleName },
    defaultMessage: '{ruleName} was created',
  });
