/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ML_RULE_JOBS_WARNING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.mlJobsWarning.popover.description',
  {
    defaultMessage:
      'The following jobs are not running and might cause the rule to generate wrong results:',
  }
);

export const ML_RULE_JOBS_WARNING_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagementUi.rulesTable.mlJobsWarning.popover.buttonLabel',
  {
    defaultMessage: 'Visit rule details page to investigate',
  }
);

export const INSTALLED_RULES_TAB = (ruleCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.tabs.rules', {
    defaultMessage: `Installed Rules [{ruleCount}]`,
    values: { ruleCount },
  });

export const RULE_MONITORING_TAB = (ruleCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.tabs.monitoring', {
    defaultMessage: 'Rule Monitoring [{ruleCount}]',
    values: { ruleCount },
  });

export const RULE_UPDATES_TAB = (ruleCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.tabs.updates', {
    defaultMessage: 'Rule Updates [{ruleCount} New]',
    values: { ruleCount },
  });

export const ADD_RULES_TAB = (ruleCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.allRules.tabs.addRules', {
    defaultMessage: 'Add Rules [{ruleCount}]',
    values: { ruleCount },
  });
