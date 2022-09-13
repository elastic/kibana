/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HOST_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.hostRiskToolTip',
  {
    defaultMessage:
      'Host risk classification is determined by host risk score. Hosts classified as Critical or High are indicated as risky.',
  }
);

export const HOST_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.hostRiskClassificationTitle',
  {
    defaultMessage: 'Host risk classification',
  }
);

export const HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.hostRiskScoreTitle',
  {
    defaultMessage: 'Host risk score',
  }
);

export const HOST_NAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.hostNameTitle',
  {
    defaultMessage: 'Host Name',
  }
);

export const HOST_RISK_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.title',
  {
    defaultMessage: 'Host Risk Scores',
  }
);

export const TOTAL_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.totalLabel',
  {
    defaultMessage: 'Total',
  }
);

export const VIEW_ALL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.viewAllLabel',
  {
    defaultMessage: 'View all',
  }
);

export const ENABLE_HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.enableHostRiskScore',
  {
    defaultMessage: 'Enable Host Risk Score',
  }
);

export const ENABLE_HOST_RISK_SCORE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.enableHostRiskScoreDescription',
  {
    defaultMessage:
      'Once you have enabled this feature you can get quick access to the host risk scores in this section.',
  }
);

export const ENABLE_RISK_SCORE_POPOVER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.enableRiskScorePopoverTitle',
  {
    defaultMessage: 'Alerts need to be available before enabling module',
  }
);

export const HOST_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.hostsTableTooltip',
  {
    defaultMessage:
      'The host risk table is not affected by the time range. This table shows the latest recorded risk score for each host.',
  }
);
