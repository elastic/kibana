/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ML_JOB_SETTINGS = i18n.translate(
  'xpack.securitySolution.components.mlPopup.mlJobSettingsButtonLabel',
  {
    defaultMessage: 'ML job settings',
  }
);

export const UPGRADE_TITLE = i18n.translate(
  'xpack.securitySolution.components.mlPopup.upgradeTitle',
  {
    defaultMessage: 'Upgrade to Elastic Platinum',
  }
);

export const UPGRADE_BUTTON = i18n.translate(
  'xpack.securitySolution.components.mlPopup.upgradeButtonLabel',
  {
    defaultMessage: 'Subscription plans',
  }
);

export const LICENSE_BUTTON = i18n.translate(
  'xpack.securitySolution.components.mlPopup.licenseButtonLabel',
  {
    defaultMessage: 'Manage license',
  }
);

export const MODULE_NOT_COMPATIBLE_TITLE = (incompatibleJobCount: number) =>
  i18n.translate('xpack.securitySolution.components.mlPopup.moduleNotCompatibleTitle', {
    values: { incompatibleJobCount },
    defaultMessage:
      '{incompatibleJobCount} {incompatibleJobCount, plural, =1 {job} other {jobs}} are currently unavailable',
  });

export const START_JOB_FAILURE = i18n.translate(
  'xpack.securitySolution.components.mlPopup.errors.startJobFailureTitle',
  {
    defaultMessage: 'Start job failure',
  }
);

export const STOP_JOB_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.errors.stopJobFailureTitle',
  {
    defaultMessage: 'Stop job failure',
  }
);

export const CREATE_JOB_FAILURE = i18n.translate(
  'xpack.securitySolution.components.mlPopup.errors.createJobFailureTitle',
  {
    defaultMessage: 'Create job failure',
  }
);
