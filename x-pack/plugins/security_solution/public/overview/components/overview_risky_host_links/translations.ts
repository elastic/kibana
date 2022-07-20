/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardWarningPanelTitle',
  {
    defaultMessage: 'No host risk score data available to display',
  }
);

export const WARNING_BODY = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardWarningPanelBody',
  {
    defaultMessage: `We haven't detected any host risk score data from the hosts in your environment for the selected time range.`,
  }
);

export const DANGER_TITLE = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardDangerPanelTitle',
  {
    defaultMessage: 'No host risk score data',
  }
);

export const DANGER_BODY = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardEnableThreatIntel',
  {
    defaultMessage: 'You must enable the host risk module to view risky hosts.',
  }
);

export const ENABLE_VIA_DEV_TOOLS = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardDangerPanelButton',
  {
    defaultMessage: 'Enable via Dev Tools',
  }
);

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardLearnMoreButton',
  {
    defaultMessage: 'Learn More',
  }
);

export const LINK_COPY = i18n.translate('xpack.securitySolution.overview.riskyHostsSource', {
  defaultMessage: 'Source',
});

export const PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.overview.riskyHostsDashboardTitle',
  {
    defaultMessage: 'Current host risk scores',
  }
);

export const IMPORT_DASHBOARD = i18n.translate('xpack.securitySolution.overview.importDasboard', {
  defaultMessage: 'Import dashboard',
});

export const ENABLE_RISK_SCORE_POPOVER = i18n.translate(
  'xpack.securitySolution.overview.enableRiskScorePopoverTitle',
  {
    defaultMessage: 'Alerts need to be available before enabling module',
  }
);
