/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskDeprecated.hosts.upgradeHostRiskScore',
  {
    defaultMessage: 'Upgrade Host Risk Score',
  }
);

export const UPGRADE_USER_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.riskDeprecated.users.upgradeUserRiskScore',
  {
    defaultMessage: 'Upgrade User Risk Score',
  }
);

export const UPGRADE_RISK_SCORE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskDeprecated.entity.upgradeHostRiskScoreDescription',
  {
    defaultMessage:
      'Current data is no longer supported. Please migrate your data and upgrade the module. The data might need an hour to be generated after enabling the module.',
  }
);

export const ENABLE_RISK_SCORE_POPOVER = i18n.translate(
  'xpack.securitySolution.riskDeprecated.entity.enableRiskScorePopoverTitle',
  {
    defaultMessage: 'Alerts need to be available before upgrading module.',
  }
);
