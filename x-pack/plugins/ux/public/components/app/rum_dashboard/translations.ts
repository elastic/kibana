/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const I18LABELS = {
  dataMissing: i18n.translate('xpack.ux.dashboard.dataMissing', {
    defaultMessage: 'N/A',
  }),
  totalPageLoad: i18n.translate('xpack.ux.dashboard.totalPageLoad', {
    defaultMessage: 'Total',
  }),
  backEnd: i18n.translate('xpack.ux.dashboard.backend', {
    defaultMessage: 'Backend',
  }),
  frontEnd: i18n.translate('xpack.ux.dashboard.frontend', {
    defaultMessage: 'Frontend',
  }),
  pageViews: i18n.translate('xpack.ux.dashboard.pageViews', {
    defaultMessage: 'Total page views',
  }),
  percPageLoaded: i18n.translate('xpack.ux.dashboard.pagesLoaded.label', {
    defaultMessage: 'Pages loaded',
  }),
  pageLoadTime: i18n.translate('xpack.ux.dashboard.pageLoadTime.label', {
    defaultMessage: 'Page load time (seconds)',
  }),
  pageLoadTimes: i18n.translate('xpack.ux.dashboard.pageLoadTimes.label', {
    defaultMessage: 'Page load times',
  }),
  pageLoadDuration: i18n.translate(
    'xpack.ux.dashboard.pageLoadDuration.label',
    {
      defaultMessage: 'Page load duration',
    }
  ),
  pageLoad: i18n.translate('xpack.ux.dashboard.pageLoad.label', {
    defaultMessage: 'Page load',
  }),
  pageLoadDistribution: i18n.translate(
    'xpack.ux.dashboard.pageLoadDistribution.label',
    {
      defaultMessage: 'Page load distribution',
    }
  ),
  jsErrors: i18n.translate('xpack.ux.dashboard.impactfulMetrics.jsErrors', {
    defaultMessage: 'JavaScript errors',
  }),
  highTrafficPages: i18n.translate(
    'xpack.ux.dashboard.impactfulMetrics.highTrafficPages',
    {
      defaultMessage: 'High traffic pages',
    }
  ),
  resetZoom: i18n.translate('xpack.ux.dashboard.resetZoom.label', {
    defaultMessage: 'Reset zoom',
  }),
  overall: i18n.translate('xpack.ux.dashboard.overall.label', {
    defaultMessage: 'Overall',
  }),
  selectBreakdown: i18n.translate('xpack.ux.filterGroup.selectBreakdown', {
    defaultMessage: 'Select breakdown',
  }),
  breakdown: i18n.translate('xpack.ux.filterGroup.breakdown', {
    defaultMessage: 'Breakdown',
  }),
  seconds: i18n.translate('xpack.ux.filterGroup.seconds', {
    defaultMessage: 'seconds',
  }),
  coreWebVitals: i18n.translate('xpack.ux.filterGroup.coreWebVitals', {
    defaultMessage: 'Core web vitals',
  }),
  browser: i18n.translate('xpack.ux.visitorBreakdown.browser', {
    defaultMessage: 'Browser',
  }),
  operatingSystem: i18n.translate('xpack.ux.visitorBreakdown.operatingSystem', {
    defaultMessage: 'Operating system',
  }),
  metrics: i18n.translate('xpack.ux.metrics', {
    defaultMessage: 'Metrics',
  }),
  median: i18n.translate('xpack.ux.median', {
    defaultMessage: 'median',
  }),
  avgPageLoadDuration: i18n.translate(
    'xpack.ux.visitorBreakdownMap.avgPageLoadDuration',
    {
      defaultMessage: 'Average page load duration',
    }
  ),
  pageLoadDurationByRegion: i18n.translate(
    'xpack.ux.visitorBreakdownMap.pageLoadDurationByRegion',
    {
      defaultMessage: 'Page load duration by region (avg.)',
    }
  ),
  filterByUrl: i18n.translate('xpack.ux.filters.filterByUrl', {
    defaultMessage: 'Filter by URL',
  }),
  getSearchResultsLabel: (total: number) =>
    i18n.translate('xpack.ux.filters.searchResults', {
      defaultMessage: '{total} Search results',
      values: { total },
    }),
  topPages: i18n.translate('xpack.ux.filters.topPages', {
    defaultMessage: 'Top pages',
  }),
  select: i18n.translate('xpack.ux.filters.select', {
    defaultMessage: 'Select',
  }),
  url: i18n.translate('xpack.ux.filters.url', {
    defaultMessage: 'Url',
  }),
  loadingResults: i18n.translate('xpack.ux.filters.url.loadingResults', {
    defaultMessage: 'Loading results',
  }),
  noResults: i18n.translate('xpack.ux.filters.url.noResults', {
    defaultMessage: 'No results available',
  }),
  totalErrors: i18n.translate('xpack.ux.jsErrors.totalErrors', {
    defaultMessage: 'Total errors',
  }),
  errorRate: i18n.translate('xpack.ux.jsErrors.errorRate', {
    defaultMessage: 'Error rate',
  }),
  errorMessage: i18n.translate('xpack.ux.jsErrors.errorMessage', {
    defaultMessage: 'Error message',
  }),
  impactedPageLoads: i18n.translate('xpack.ux.jsErrors.impactedPageLoads', {
    defaultMessage: 'Impacted page loads',
  }),
  percentile: i18n.translate('xpack.ux.percentile.label', {
    defaultMessage: 'Percentile',
  }),
  percentile50thMedian: i18n.translate('xpack.ux.percentile.50thMedian', {
    defaultMessage: '50th (Median)',
  }),
  percentile75th: i18n.translate('xpack.ux.percentile.75th', {
    defaultMessage: '75th',
  }),
  percentile90th: i18n.translate('xpack.ux.percentile.90th', {
    defaultMessage: '90th',
  }),
  percentile95th: i18n.translate('xpack.ux.percentile.95th', {
    defaultMessage: '95th',
  }),
  percentile99th: i18n.translate('xpack.ux.percentile.99th', {
    defaultMessage: '99th',
  }),
  noData: i18n.translate('xpack.ux.visitorBreakdown.noData', {
    defaultMessage: 'No data.',
  }),
  // Helper tooltips
  totalPageLoadTooltip: i18n.translate(
    'xpack.ux.dashboard.tooltips.totalPageLoad',
    {
      defaultMessage: 'Total represents the full page load duration',
    }
  ),
  frontEndTooltip: i18n.translate('xpack.ux.dashboard.tooltips.frontEnd', {
    defaultMessage:
      'Frontend time represents the total page load duration minus the backend time',
  }),
  backEndTooltip: i18n.translate('xpack.ux.dashboard.tooltips.backEnd', {
    defaultMessage:
      'Backend time represents time to first byte (TTFB), which is when the first response packet is received after the request has been made',
  }),
};

export const VisitorBreakdownLabel = i18n.translate(
  'xpack.ux.visitorBreakdown',
  {
    defaultMessage: 'Visitor breakdown',
  }
);
