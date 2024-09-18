/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ChromeBreadcrumb } from '@kbn/core/public';

import type { NavigateToPath } from '../contexts/kibana';

export const ML_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.machineLearningBreadcrumbLabel', {
    defaultMessage: 'Machine Learning',
  }),
  href: '/',
});

export const SETTINGS_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settingsBreadcrumbLabel', {
    defaultMessage: 'Settings',
  }),
  href: '/settings',
  deepLinkId: 'ml:settings',
});

export const ANOMALY_DETECTION_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.anomalyDetectionBreadcrumbLabel', {
    defaultMessage: 'Anomaly Detection',
  }),
  href: '/jobs',
  deepLinkId: 'ml:anomalyDetection',
});

export const DATA_FRAME_ANALYTICS_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.dataFrameAnalyticsLabel', {
    defaultMessage: 'Data Frame Analytics',
  }),
  href: '/data_frame_analytics',
  deepLinkId: 'ml:dataFrameAnalytics',
});

export const TRAINED_MODELS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.modelManagementLabel', {
    defaultMessage: 'Model Management',
  }),
  href: '/trained_models',
  deepLinkId: 'ml:modelManagement',
});

export const SUPPLIED_CONFIGURATIONS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.suppliedConfigurationsLabel', {
    defaultMessage: 'Supplied configurations',
  }),
  href: '/supplied_configurations',
  deepLinkId: 'ml:suppliedConfigurations',
});

export const DATA_VISUALIZER_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.datavisualizerBreadcrumbLabel', {
    defaultMessage: 'Data Visualizer',
  }),
  href: '/datavisualizer',
  deepLinkId: 'ml:dataVisualizer',
});

// we need multiple AIOPS_BREADCRUMB breadcrumb items as they each need to link
// to each of the AIOps pages.
export const AIOPS_BREADCRUMB_LOG_RATE_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/log_rate_analysis_index_select',
});

export const AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/log_categorization_index_select',
});

export const AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/change_point_detection_index_select',
});

export const LOG_RATE_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.logRateAnalysisBreadcrumbLabel', {
    defaultMessage: 'Log Rate Analysis',
  }),
  href: '/aiops/log_rate_analysis_index_select',
  deepLinkId: 'ml:logRateAnalysis',
});

export const LOG_PATTERN_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.logPatternAnalysisBreadcrumbLabel', {
    defaultMessage: 'Log Pattern Analysis',
  }),
  href: '/aiops/log_categorization_index_select',
  deepLinkId: 'ml:logPatternAnalysis',
});

export const CHANGE_POINT_DETECTION: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.changePointDetectionBreadcrumbLabel', {
    defaultMessage: 'Change Point Detection',
  }),
  href: '/aiops/change_point_detection_index_select',
  deepLinkId: 'ml:changePointDetections',
});

export const CREATE_JOB_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.createJobsBreadcrumbLabel', {
    defaultMessage: 'Create job',
  }),
  href: '/jobs/new_job',
});

export const CALENDAR_MANAGEMENT_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagementLabel', {
    defaultMessage: 'Calendar management',
  }),
  href: '/settings/calendars_list',
  deepLinkId: 'ml:calendarSettings',
});

export const FILTER_LISTS_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.filterListsLabel', {
    defaultMessage: 'Filter lists',
  }),
  href: '/settings/filter_lists',
  deepLinkId: 'ml:filterListsSettings',
});

export const DATA_DRIFT_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.dataComparisonLabel', {
    defaultMessage: 'Data drift',
  }),
  href: '/data_drift_index_select',
  deepLinkId: 'ml:dataDrift',
});

const breadcrumbs = {
  ML_BREADCRUMB,
  SETTINGS_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  DATA_FRAME_ANALYTICS_BREADCRUMB,
  TRAINED_MODELS,
  DATA_DRIFT_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  AIOPS_BREADCRUMB_LOG_RATE_ANALYSIS,
  AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS,
  AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION,
  LOG_RATE_ANALYSIS,
  LOG_PATTERN_ANALYSIS,
  CHANGE_POINT_DETECTION,
  CREATE_JOB_BREADCRUMB,
  CALENDAR_MANAGEMENT_BREADCRUMB,
  FILTER_LISTS_BREADCRUMB,
  SUPPLIED_CONFIGURATIONS,
};
type Breadcrumb = keyof typeof breadcrumbs;

export const breadcrumbOnClickFactory = (
  path: string | undefined,
  navigateToPath: NavigateToPath
): ChromeBreadcrumb['onClick'] => {
  return (e) => {
    e.preventDefault();
    navigateToPath(path);
  };
};

export const getBreadcrumbWithUrlForApp = (
  breadcrumbName: Breadcrumb,
  navigateToPath?: NavigateToPath,
  basePath?: string
): ChromeBreadcrumb => {
  return {
    text: breadcrumbs[breadcrumbName].text,
    ...(navigateToPath
      ? {
          href: `${basePath}/app/ml${breadcrumbs[breadcrumbName].href}`,
          deepLinkId: breadcrumbs[breadcrumbName].deepLinkId,
          onClick: breadcrumbOnClickFactory(breadcrumbs[breadcrumbName].href, navigateToPath),
        }
      : {}),
  };
};
