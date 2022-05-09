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
});

export const ANOMALY_DETECTION_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.anomalyDetectionBreadcrumbLabel', {
    defaultMessage: 'Anomaly Detection',
  }),
  href: '/jobs',
});

export const DATA_FRAME_ANALYTICS_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.dataFrameAnalyticsLabel', {
    defaultMessage: 'Data Frame Analytics',
  }),
  href: '/data_frame_analytics',
});

export const TRAINED_MODELS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.modelManagementLabel', {
    defaultMessage: 'Model Management',
  }),
  href: '/trained_models',
});

export const DATA_VISUALIZER_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.datavisualizerBreadcrumbLabel', {
    defaultMessage: 'Data Visualizer',
  }),
  href: '/datavisualizer',
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
});

export const FILTER_LISTS_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.filterListsLabel', {
    defaultMessage: 'Filter lists',
  }),
  href: '/settings/filter_lists',
});

const breadcrumbs = {
  ML_BREADCRUMB,
  SETTINGS_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  DATA_FRAME_ANALYTICS_BREADCRUMB,
  TRAINED_MODELS,
  DATA_VISUALIZER_BREADCRUMB,
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
): EuiBreadcrumb => {
  return {
    text: breadcrumbs[breadcrumbName].text,
    ...(navigateToPath
      ? {
          href: `${basePath}/app/ml${breadcrumbs[breadcrumbName].href}`,
          onClick: breadcrumbOnClickFactory(breadcrumbs[breadcrumbName].href, navigateToPath),
        }
      : {}),
  };
};
