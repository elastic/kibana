/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { getRiskEntityTranslation } from '../risk_score/translations';

export const BETA = i18n.translate('xpack.securitySolution.riskScore.technicalPreviewLabel', {
  defaultMessage: 'Beta',
});

export const HOST_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.hostsDashboardWarningPanelTitle',
  {
    defaultMessage: 'No host risk score data available to display',
  }
);

export const USER_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardWarningPanelTitle',
  {
    defaultMessage: 'No user risk score data available to display',
  }
);

export const HOST_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.riskScore.hostsDashboardWarningPanelBody',
  {
    defaultMessage: `We haven’t found any host risk score data. Check if you have any global filters in the global KQL search bar. If you have just enabled the host risk module, the risk engine might need an hour to generate host risk score data and display in this panel.`,
  }
);

export const USER_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardWarningPanelBody',
  {
    defaultMessage: `We haven’t found any user risk score data. Check if you have any global filters in the global KQL search bar. If you have just enabled the user risk module, the risk engine might need an hour to generate user risk score data and display in this panel.`,
  }
);

export const RESTART_TOOLTIP = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardRestartTooltip',
  {
    defaultMessage:
      'The risk score calculation might take a while to run. However, by pressing restart, you can force it to run immediately.',
  }
);

export const RISK_DATA_TITLE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.alertDetails.overview.hostRiskDataTitle', {
    defaultMessage: '{riskEntity} Risk Data',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });
