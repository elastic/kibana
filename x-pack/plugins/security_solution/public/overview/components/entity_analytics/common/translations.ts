/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOTAL_LABEL = i18n.translate('xpack.securitySolution.entityAnalytics.totalLabel', {
  defaultMessage: 'Total',
});

export const HOST_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.title',
  {
    defaultMessage: 'Host Risk Scores',
  }
);

export const USER_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.title',
  {
    defaultMessage: 'User Risk Scores',
  }
);

export const HOST_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.hostsTableTooltip',
  {
    defaultMessage:
      'The host risk table is not affected by the time range. This table shows the latest recorded risk score for each host.',
  }
);

export const USER_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.usersRiskDashboard.usersTableTooltip',
  {
    defaultMessage:
      'The user risk table is not affected by the time range. This table shows the latest recorded risk score for each user.',
  }
);
