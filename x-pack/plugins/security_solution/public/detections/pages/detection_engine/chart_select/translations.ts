/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_COUNT_LEGEND = i18n.translate(
  'xpack.securitySolution.components.chartOptions.alertsCountLegend',
  {
    defaultMessage: 'Alerts count',
  }
);

export const CHART_OPTIONS = i18n.translate(
  'xpack.securitySolution.components.chartOptions.chartOptionsButton',
  {
    defaultMessage: 'Chart options',
  }
);

export const HIDE_ALERTS_COUNT = i18n.translate(
  'xpack.securitySolution.components.chartOptions.hideAlertsCountOption',
  {
    defaultMessage: 'Hide alerts count',
  }
);

export const SHOW = i18n.translate('xpack.securitySolution.components.chartOptions.showLabel', {
  defaultMessage: 'Show',
});

export const TREND_VIEW = i18n.translate(
  'xpack.securitySolution.components.chartOptions.trendViewOption',
  {
    defaultMessage: 'Trend view',
  }
);

export const TREND_VIEW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.components.chartOptions.trendViewDescription',
  {
    defaultMessage: 'View the trend of alerts as a stacked bar chart',
  }
);

export const ALERTS_BY_RISK_SCORE_VIEW = i18n.translate(
  'xpack.securitySolution.components.chartOptions.alertsByRiskScoreViewOption',
  {
    defaultMessage: 'Alerts by risk score view',
  }
);

export const ALERTS_BY_RISK_SCORE_VIEW_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.components.chartOptions.alertsByRiskScoreViewDescription',
  {
    defaultMessage: 'View a treemap of alerts, colored by risk score',
  }
);

export const SHOW_TREND_CHART = i18n.translate(
  'xpack.securitySolution.components.chartOptions.showTrendChartLabel',
  {
    defaultMessage: 'Show trend chart',
  }
);
