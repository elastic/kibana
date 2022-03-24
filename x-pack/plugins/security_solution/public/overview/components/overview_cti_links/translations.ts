/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFO_TITLE = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardInfoPanelTitle',
  {
    defaultMessage: 'Enable Kibana dashboard to view sources',
  }
);

export const INFO_BODY = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardInfoPanelBody',
  {
    defaultMessage:
      'Follow this guide to enable your dashboard so that you can view your sources in visualizations.',
  }
);

export const INFO_BUTTON = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardInfoPanelButton',
  {
    defaultMessage: 'How to load Kibana dashboards',
  }
);

export const WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardWarningPanelTitle',
  {
    defaultMessage: 'No threat intel data available to display',
  }
);

export const WARNING_BODY = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardWarningPanelBody',
  {
    defaultMessage: `We haven't detected any data from the selected time range, please try to search for another time range.`,
  }
);

export const DANGER_TITLE = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardDangerPanelTitle',
  {
    defaultMessage: 'No threat intel data available to display',
  }
);

export const DANGER_BODY = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardEnableThreatIntel',
  {
    defaultMessage: 'You need to enable threat intel sources in order to view data.',
  }
);

export const DANGER_BUTTON = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardDangerButton',
  {
    defaultMessage: 'Enable sources',
  }
);

export const PANEL_TITLE = i18n.translate('xpack.securitySolution.overview.ctiDashboardTitle', {
  defaultMessage: 'Threat Intelligence',
});

export const VIEW_DASHBOARD = i18n.translate('xpack.securitySolution.overview.ctiViewDasboard', {
  defaultMessage: 'View dashboard',
});

export const OTHER_DATA_SOURCE_TITLE = i18n.translate(
  'xpack.securitySolution.overview.ctiDashboardOtherDatasourceTitle',
  {
    defaultMessage: 'Others',
  }
);
