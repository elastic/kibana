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

export const THROTTLE_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.fieldThrottleHelpText',
  {
    defaultMessage:
      'Select when automated actions should be performed if a rule evaluates as true.',
  }
);

export const THROTTLE_FIELD_HELP_TEXT_WHEN_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.fieldThrottleHelpTextWhenQuery',
  {
    defaultMessage:
      'Select when automated actions should be performed if a rule evaluates as true. This frequency does not apply to Response Actions.',
  }
);
