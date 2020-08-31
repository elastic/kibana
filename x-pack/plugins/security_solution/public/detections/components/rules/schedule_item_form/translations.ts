/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SECONDS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRuleForm.secondsOptionDescription',
  {
    defaultMessage: 'Seconds',
  }
);

export const MINUTES = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRuleForm.minutesOptionDescription',
  {
    defaultMessage: 'Minutes',
  }
);

export const HOURS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRuleForm.hoursOptionDescription',
  {
    defaultMessage: 'Hours',
  }
);

export const INVALID_TIME = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepScheduleRuleForm.invalidTimeMessageDescription',
  {
    defaultMessage: 'A time is required.',
  }
);
