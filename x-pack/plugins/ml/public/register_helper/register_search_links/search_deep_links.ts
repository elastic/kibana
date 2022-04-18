/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { AppDeepLink } from '@kbn/core/public';
import { ML_PAGES } from '../../../common/constants/locator';

const OVERVIEW_LINK_DEEP_LINK: AppDeepLink = {
  id: 'mlOverviewDeepLink',
  title: i18n.translate('xpack.ml.deepLink.overview', {
    defaultMessage: 'Overview',
  }),
  path: `/${ML_PAGES.OVERVIEW}`,
};

const ANOMALY_DETECTION_DEEP_LINK: AppDeepLink = {
  id: 'mlAnomalyDetectionDeepLink',
  title: i18n.translate('xpack.ml.deepLink.anomalyDetection', {
    defaultMessage: 'Anomaly Detection',
  }),
  path: `/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`,
};

const DATA_FRAME_ANALYTICS_DEEP_LINK: AppDeepLink = {
  id: 'mlDataFrameAnalyticsDeepLink',
  title: i18n.translate('xpack.ml.deepLink.dataFrameAnalytics', {
    defaultMessage: 'Data Frame Analytics',
  }),
  path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE}`,
};

const MODEL_MANAGEMENT_DEEP_LINK: AppDeepLink = {
  id: 'mlModelManagementDeepLink',
  title: i18n.translate('xpack.ml.deepLink.trainedModels', {
    defaultMessage: 'Trained Models',
  }),
  path: `/${ML_PAGES.TRAINED_MODELS_MANAGE}`,
  deepLinks: [
    {
      id: 'mlNodesOverviewDeepLink',
      title: i18n.translate('xpack.ml.deepLink.modelManagement', {
        defaultMessage: 'Model Management',
      }),
      path: `/${ML_PAGES.TRAINED_MODELS_MANAGE}`,
    },
    {
      id: 'mlNodesOverviewDeepLink',
      title: i18n.translate('xpack.ml.deepLink.nodesOverview', {
        defaultMessage: 'Nodes',
      }),
      path: `/${ML_PAGES.TRAINED_MODELS_NODES}`,
    },
  ],
};

const DATA_VISUALIZER_DEEP_LINK: AppDeepLink = {
  id: 'dataVisualizerDeepLink',
  title: i18n.translate('xpack.ml.deepLink.dataVisualizer', {
    defaultMessage: 'Data Visualizer',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER}`,
};

const FILE_UPLOAD_DEEP_LINK: AppDeepLink = {
  id: 'mlFileUploadDeepLink',
  title: i18n.translate('xpack.ml.deepLink.fileUpload', {
    defaultMessage: 'File Upload',
  }),
  keywords: ['CSV', 'JSON'],
  path: `/${ML_PAGES.DATA_VISUALIZER_FILE}`,
};

const INDEX_DATA_VISUALIZER_DEEP_LINK: AppDeepLink = {
  id: 'mlIndexDataVisualizerDeepLink',
  title: i18n.translate('xpack.ml.deepLink.indexDataVisualizer', {
    defaultMessage: 'Index Data Visualizer',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER_INDEX_SELECT}`,
};

const SETTINGS_DEEP_LINK: AppDeepLink = {
  id: 'mlSettingsDeepLink',
  title: i18n.translate('xpack.ml.deepLink.settings', {
    defaultMessage: 'Settings',
  }),
  path: `/${ML_PAGES.SETTINGS}`,
  deepLinks: [
    {
      id: 'mlCalendarSettingsDeepLink',
      title: i18n.translate('xpack.ml.deepLink.calendarSettings', {
        defaultMessage: 'Calendars',
      }),
      path: `/${ML_PAGES.CALENDARS_MANAGE}`,
    },
    {
      id: 'mlFilterListsSettingsDeepLink',
      title: i18n.translate('xpack.ml.deepLink.filterListsSettings', {
        defaultMessage: 'Filter Lists',
      }),
      path: `/${ML_PAGES.SETTINGS}`, // Link to settings page as read only users cannot view filter lists.
    },
  ],
};

export function getDeepLinks(isFullLicense: boolean) {
  const deepLinks: AppDeepLink[] = [
    DATA_VISUALIZER_DEEP_LINK,
    FILE_UPLOAD_DEEP_LINK,
    INDEX_DATA_VISUALIZER_DEEP_LINK,
  ];

  if (isFullLicense === true) {
    deepLinks.push(
      OVERVIEW_LINK_DEEP_LINK,
      ANOMALY_DETECTION_DEEP_LINK,
      DATA_FRAME_ANALYTICS_DEEP_LINK,
      MODEL_MANAGEMENT_DEEP_LINK,
      SETTINGS_DEEP_LINK
    );
  }

  return deepLinks;
}
