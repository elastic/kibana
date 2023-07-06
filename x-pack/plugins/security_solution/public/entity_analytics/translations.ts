/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOW_HOSTS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.hosts.show',
  {
    defaultMessage: 'Show hosts',
  }
);

export const HIDE_HOSTS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.hosts.hide',
  {
    defaultMessage: 'Hide hosts',
  }
);

export const SHOW_USERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.users.show',
  {
    defaultMessage: 'Show users',
  }
);

export const HIDE_USERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.users.hide',
  {
    defaultMessage: 'Hide users',
  }
);

export const RISK_SCORE_MODULE_STATUS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.status',
  {
    defaultMessage: 'Status',
  }
);

export const RISK_SCORE_MODULE_STATUS_ON = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.statusOn',
  {
    defaultMessage: 'On',
  }
);

export const RISK_SCORE_MODULE_STATUS_OFF = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.statusOff',
  {
    defaultMessage: 'Off',
  }
);

export const ENTITY_RISK_SCORING = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.entityRiskScoring',
  {
    defaultMessage: 'Entity risk scoring',
  }
);

export const USEFUL_LINKS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.usefulLinks',
  {
    defaultMessage: 'Useful links',
  }
);

export const EA_DOCS_DASHBOARD = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsDashboard',
  {
    defaultMessage: 'Entity Analytics documentation',
  }
);

export const EA_DOCS_RISK_HOSTS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsHosts',
  {
    defaultMessage: 'Host risk score',
  }
);

export const EA_DOCS_RISK_USERS = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.eaDocsUsers',
  {
    defaultMessage: 'User risk score',
  }
);

export const PREVIEW = i18n.translate('xpack.securitySolution.riskScore.riskScorePreview.preview', {
  defaultMessage: 'Preview',
});

export const PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.previewDescription',
  {
    defaultMessage:
      'The entities shown in the preview are the riskiest found in the 1000 sampled during your chosen timeframe. They may not be the riskiest entities across all of your data.',
  }
);

export const PREVIEW_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.errorTitle',
  {
    defaultMessage: 'Preview failed',
  }
);

export const PREVIEW_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.errorMessage',
  {
    defaultMessage: 'Something went wrong when creating the preview. Please try again.',
  }
);

export const PREVIEW_ERROR_TRY_AGAIN = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.tryAgain',
  {
    defaultMessage: 'Try again',
  }
);

export const PREVIEW_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.riskScorePreview.queryErrorTitle',
  {
    defaultMessage: 'Invalid query',
  }
);
