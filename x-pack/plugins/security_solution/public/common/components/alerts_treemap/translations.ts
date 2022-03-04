/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_DATA_LABEL = i18n.translate(
  'xpack.securitySolution.components.alertsTreemap.noDataLabel',
  {
    defaultMessage: 'No data to display',
  }
);

export const RISK_LABEL = (riskScore: number) =>
  i18n.translate('xpack.securitySolution.components.alertsTreemap.riskLabel', {
    values: {
      riskScore,
    },
    defaultMessage: '(Risk {riskScore})',
  });

export const SUBTITLE = (maxItems: number) =>
  i18n.translate('xpack.securitySolution.components.alertsTreemap.subtitle', {
    values: {
      maxItems,
    },
    defaultMessage: 'Showing the top {maxItems} most frequently occurring alerts',
  });

export const ALERTS_BY_RISK_SCORE_TITLE = i18n.translate(
  'xpack.securitySolution.components.alertsTreemap.aletsByRiskScoreTitle',
  {
    defaultMessage: 'Alerts by risk score',
  }
);

export const SHOW_ALL = i18n.translate(
  'xpack.securitySolution.components.alertsTreemap.showAllButton',
  {
    defaultMessage: 'Show all alerts',
  }
);
