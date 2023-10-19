/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBreadcrumb } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ChromeBreadcrumb } from '@kbn/core/public';

import { NavigateToPath } from '../contexts/kibana';

export type MlBreadcrumb = ChromeBreadcrumb & {
  /**
   * If this breadcrumb is a root level navigation item.
   * Root level navigational breadcrumbs shouldn't be set in serverless, as they are
   * controlled by each project's navigation tree
   */
  isRootLevelCrumb?: true;
};

export const ML_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.machineLearningBreadcrumbLabel', {
    defaultMessage: 'Machine Learning',
  }),
  href: '/',
  isRootLevelCrumb: true,
});

export const SETTINGS_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settingsBreadcrumbLabel', {
    defaultMessage: 'Settings',
  }),
  href: '/settings',
});

export const ANOMALY_DETECTION_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.anomalyDetectionBreadcrumbLabel', {
    defaultMessage: 'Anomaly Detection',
  }),
  href: '/jobs',
  isRootLevelCrumb: true,
});

export const DATA_FRAME_ANALYTICS_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.dataFrameAnalyticsLabel', {
    defaultMessage: 'Data Frame Analytics',
  }),
  href: '/data_frame_analytics',
  isRootLevelCrumb: true,
});

export const TRAINED_MODELS: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.modelManagementLabel', {
    defaultMessage: 'Model Management',
  }),
  href: '/trained_models',
  isRootLevelCrumb: true,
});

export const DATA_VISUALIZER_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.datavisualizerBreadcrumbLabel', {
    defaultMessage: 'Data Visualizer',
  }),
  href: '/datavisualizer',
  isRootLevelCrumb: true,
});

// we need multiple AIOPS_BREADCRUMB breadcrumb items as they each need to link
// to each of the AIOps pages.
export const AIOPS_BREADCRUMB_LOG_RATE_ANALYSIS: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/log_rate_analysis_index_select',
  isRootLevelCrumb: true,
});

export const AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/log_categorization_index_select',
  isRootLevelCrumb: true,
});

export const AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/change_point_detection_index_select',
  isRootLevelCrumb: true,
});

export const LOG_RATE_ANALYSIS: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.logRateAnalysisBreadcrumbLabel', {
    defaultMessage: 'Log Rate Analysis',
  }),
  href: '/aiops/log_rate_analysis_index_select',
});

export const LOG_PATTERN_ANALYSIS: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.logPatternAnalysisBreadcrumbLabel', {
    defaultMessage: 'Log Pattern Analysis',
  }),
  href: '/aiops/log_categorization_index_select',
});

export const CHANGE_POINT_DETECTION: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.changePointDetectionBreadcrumbLabel', {
    defaultMessage: 'Change Point Detection',
  }),
  href: '/aiops/change_point_detection_index_select',
});

export const CREATE_JOB_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.createJobsBreadcrumbLabel', {
    defaultMessage: 'Create job',
  }),
  href: '/jobs/new_job',
});

export const CALENDAR_MANAGEMENT_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagementLabel', {
    defaultMessage: 'Calendar management',
  }),
  href: '/settings/calendars_list',
});

export const FILTER_LISTS_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.filterListsLabel', {
    defaultMessage: 'Filter lists',
  }),
  href: '/settings/filter_lists',
});

export const DATA_DRIFT_BREADCRUMB: MlBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.dataComparisonLabel', {
    defaultMessage: 'Data drift',
  }),
  href: '/data_drift_index_select',
  isRootLevelCrumb: true,
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
};
type Breadcrumb = keyof typeof breadcrumbs;

export const breadcrumbOnClickFactory = (
  path: string | undefined,
  navigateToPath: NavigateToPath
): EuiBreadcrumb['onClick'] => {
  return (e) => {
    e.preventDefault();
    navigateToPath(path);
  };
};

export const getBreadcrumbWithUrlForApp = (
  breadcrumbName: Breadcrumb,
  navigateToPath?: NavigateToPath,
  basePath?: string
): MlBreadcrumb => {
  return {
    text: breadcrumbs[breadcrumbName].text,
    isRootLevelCrumb: breadcrumbs[breadcrumbName].isRootLevelCrumb,
    ...(navigateToPath
      ? {
          href: `${basePath}/app/ml${breadcrumbs[breadcrumbName].href}`,
          onClick: breadcrumbOnClickFactory(breadcrumbs[breadcrumbName].href, navigateToPath),
        }
      : {}),
  };
};
