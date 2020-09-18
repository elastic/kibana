/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const I18LABELS = {
  backEnd: i18n.translate('xpack.apm.rum.dashboard.backend', {
    defaultMessage: 'Backend',
  }),
  frontEnd: i18n.translate('xpack.apm.rum.dashboard.frontend', {
    defaultMessage: 'Frontend',
  }),
  pageViews: i18n.translate('xpack.apm.rum.dashboard.pageViews', {
    defaultMessage: 'Page views',
  }),
  percPageLoaded: i18n.translate('xpack.apm.rum.dashboard.pagesLoaded.label', {
    defaultMessage: 'Pages loaded',
  }),
  pageLoadTime: i18n.translate('xpack.apm.rum.dashboard.pageLoadTime.label', {
    defaultMessage: 'Page load time (seconds)',
  }),
  pageLoadTimes: i18n.translate('xpack.apm.rum.dashboard.pageLoadTimes.label', {
    defaultMessage: 'Page load times',
  }),
  pageLoadDuration: i18n.translate(
    'xpack.apm.rum.dashboard.pageLoadDuration.label',
    {
      defaultMessage: 'Page load duration',
    }
  ),
  pageLoadDistribution: i18n.translate(
    'xpack.apm.rum.dashboard.pageLoadDistribution.label',
    {
      defaultMessage: 'Page load distribution',
    }
  ),
  impactfulMetrics: i18n.translate(
    'xpack.apm.rum.dashboard.impactfulMetrics.label',
    {
      defaultMessage: 'Impactful metrics',
    }
  ),
  jsErrors: i18n.translate(
    'xpack.apm.rum.dashboard.impactfulMetrics.jsErrors',
    {
      defaultMessage: 'Javascript errors',
    }
  ),
  highTrafficPages: i18n.translate(
    'xpack.apm.rum.dashboard.impactfulMetrics.highTrafficPages',
    {
      defaultMessage: 'High traffic pages',
    }
  ),
  resetZoom: i18n.translate('xpack.apm.rum.dashboard.resetZoom.label', {
    defaultMessage: 'Reset zoom',
  }),
  overall: i18n.translate('xpack.apm.rum.dashboard.overall.label', {
    defaultMessage: 'Overall',
  }),
  selectBreakdown: i18n.translate('xpack.apm.rum.filterGroup.selectBreakdown', {
    defaultMessage: 'Select breakdown',
  }),
  breakdown: i18n.translate('xpack.apm.rum.filterGroup.breakdown', {
    defaultMessage: 'Breakdown',
  }),
  seconds: i18n.translate('xpack.apm.rum.filterGroup.seconds', {
    defaultMessage: 'seconds',
  }),
  coreWebVitals: i18n.translate('xpack.apm.rum.filterGroup.coreWebVitals', {
    defaultMessage: 'Core web vitals',
  }),
  browser: i18n.translate('xpack.apm.rum.visitorBreakdown.browser', {
    defaultMessage: 'Browser',
  }),
  operatingSystem: i18n.translate(
    'xpack.apm.rum.visitorBreakdown.operatingSystem',
    {
      defaultMessage: 'Operating system',
    }
  ),
  userExperienceMetrics: i18n.translate('xpack.apm.rum.userExperienceMetrics', {
    defaultMessage: 'User experience metrics',
  }),
  avgPageLoadDuration: i18n.translate(
    'xpack.apm.rum.visitorBreakdownMap.avgPageLoadDuration',
    {
      defaultMessage: 'Average page load duration',
    }
  ),
  pageLoadDurationByRegion: i18n.translate(
    'xpack.apm.rum.visitorBreakdownMap.pageLoadDurationByRegion',
    {
      defaultMessage: 'Page load duration by region',
    }
  ),
  totalErrors: i18n.translate('xpack.apm.rum.jsErrors.totalErrors', {
    defaultMessage: 'Total errors',
  }),
  errorRate: i18n.translate('xpack.apm.rum.jsErrors.errorRate', {
    defaultMessage: 'Error rate',
  }),
  errorMessage: i18n.translate('xpack.apm.rum.jsErrors.errorMessage', {
    defaultMessage: 'Error message',
  }),
  impactedPageLoads: i18n.translate(
    'xpack.apm.rum.jsErrors.impactedPageLoads',
    {
      defaultMessage: 'Impacted page loads',
    }
  ),
};

export const VisitorBreakdownLabel = i18n.translate(
  'xpack.apm.rum.visitorBreakdown',
  {
    defaultMessage: 'Visitor breakdown',
  }
);
