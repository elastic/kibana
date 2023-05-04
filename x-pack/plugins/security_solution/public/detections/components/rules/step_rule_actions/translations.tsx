/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const NO_ACTIONS_READ_PERMISSIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.noReadActionsPrivileges',
  {
    defaultMessage:
      'Cannot create rule actions. You do not have "Read" permissions for the "Actions" plugin.',
  }
);

export const RULE_SNOOZE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.snoozeDescription',
  {
    defaultMessage:
      'Select when automated actions should be performed if a rule evaluates as true.',
  }
);

export const SNOOZED_ACTIONS_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.snoozedActionsWarning',
  {
    defaultMessage: 'Actions will not be performed until it is unsnoozed.',
  }
);
