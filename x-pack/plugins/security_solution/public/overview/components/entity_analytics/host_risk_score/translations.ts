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

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.learnMore',
  {
    defaultMessage: 'Learn more',
  }
);

export const ENABLE_VIA_DEV_TOOLS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostsRiskDashboard.enableViaDevToolsButtonTitle',
  {
    defaultMessage: 'Enable via Dev Tools',
  }
);
