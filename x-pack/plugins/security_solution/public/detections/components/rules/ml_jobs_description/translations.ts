/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ML_RUN_JOB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlRunJobLabel',
  {
    defaultMessage: 'Run job',
  }
);

export const ML_STOP_JOB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlStopJobLabel',
  {
    defaultMessage: 'Stop job',
  }
);

export const ML_JOB_STOPPED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlJobStoppedDescription',
  {
    defaultMessage: 'Stopped',
  }
);

export const ML_ADMIN_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlAdminPermissionsRequiredDescription',
  {
    defaultMessage: 'ML Admin Permissions required to perform this action',
  }
);
