/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME } from '@elastic/charts';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { AlertSummaryTimeRange, ChartThemes } from '../../sections/alert_summary_widget/types';

export const mockedAlertSummaryResponse = {
  activeAlertCount: 2,
  activeAlerts: [
    { key: 1671108000000, doc_count: 0 },
    { key: 1671208000000, doc_count: 0 },
    { key: 1671308000000, doc_count: 0 },
    { key: 1671408000000, doc_count: 2 },
    { key: 1671508000000, doc_count: 4 },
    { key: 1671608000000, doc_count: 5 },
    { key: 1671708000000, doc_count: 3 },
    { key: 1671808000000, doc_count: 6 },
    { key: 1671908000000, doc_count: 14 },
    { key: 1672008000000, doc_count: 15 },
    { key: 1672108000000, doc_count: 20 },
    { key: 1672208000000, doc_count: 10 },
    { key: 1672308000000, doc_count: 9 },
    { key: 1672408000000, doc_count: 7 },
    { key: 1672508000000, doc_count: 2 },
    { key: 1672608000000, doc_count: 2 },
  ],
  recoveredAlertCount: 20,
};

export const mockedAlertSummaryTimeRange: AlertSummaryTimeRange = {
  utcFrom: 'mockedUtcFrom',
  utcTo: 'mockedUtcTo',
  fixedInterval: 'mockedFixedInterval',
  title: 'mockedTitle',
};

export const mockedChartThemes: ChartThemes = {
  theme: EUI_CHARTS_THEME_LIGHT.theme,
  baseTheme: LIGHT_THEME,
};
