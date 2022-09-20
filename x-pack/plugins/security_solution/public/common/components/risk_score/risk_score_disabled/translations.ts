/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const HOST_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.hostsRiskDashboard.title',
  {
    defaultMessage: 'Host Risk Scores',
  }
);

export const ENABLE_HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.hostsRiskDashboard.enableHostRiskScore',
  {
    defaultMessage: 'Enable Host Risk Score',
  }
);

export const ENABLE_HOST_RISK_SCORE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.hostsRiskDashboard.enableHostRiskScoreDescription',
  {
    defaultMessage:
      'Once you have enabled this feature you can get quick access to the host risk scores in this section.',
  }
);

export const ENABLE_RISK_SCORE_POPOVER = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.hostsRiskDashboard.enableRiskScorePopoverTitle',
  {
    defaultMessage: 'Alerts need to be available before enabling module',
  }
);

export const USER_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.usersRiskDashboard.title',
  {
    defaultMessage: 'User Risk Scores',
  }
);

export const ENABLE_USER_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.usersRiskDashboard.enableUserRiskScore',
  {
    defaultMessage: 'Enable User Risk Score',
  }
);

export const ENABLE_USER_RISK_SCORE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.usersRiskDashboard.enableUserRiskScoreDescription',
  {
    defaultMessage:
      'Once you have enabled this feature you can get quick access to the user risk scores in this section.',
  }
);
