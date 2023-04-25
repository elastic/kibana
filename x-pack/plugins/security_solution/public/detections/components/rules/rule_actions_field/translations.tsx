/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FORM_ERRORS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.ruleActionsField.ruleActionsFormErrorsTitle',
  {
    defaultMessage: 'Please fix issues listed below',
  }
);

export const FORM_ON_ACTIVE_ALERT_OPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleNotifyWhen.onActiveAlert.display',
  {
    defaultMessage: 'Per rule run',
  }
);

export const FORM_CUSTOM_FREQUENCY_OPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleNotifyWhen.onThrottleInterval.display',
  {
    defaultMessage: 'Custom frequency',
  }
);

export const FORM_SUMMARY_BODY_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.body.summary.message',
  {
    defaultMessage: 'Rule {ruleName} generated {signalsCount} alerts',
    values: {
      ruleName: '{{context.rule.name}}',
      signalsCount: '{{state.signals_count}}',
    },
  }
);

export const FORM_FOR_EACH_ALERT_BODY_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.body.forEachAlert.message',
  {
    defaultMessage: 'Rule {ruleName} generated alert {alertId}',
    values: {
      ruleName: '{{context.rule.name}}',
      alertId: '{{alert.id}}',
    },
  }
);
