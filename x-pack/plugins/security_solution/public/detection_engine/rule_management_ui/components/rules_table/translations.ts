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
