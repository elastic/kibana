/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { AppDeepLink } from 'src/core/public';
import { ML_PAGES } from '../../../common/constants/ml_url_generator';

const OVERVIEW_LINK_DEEP_LINK: AppDeepLink = {
  id: 'mlOverviewSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.overview', {
    defaultMessage: 'Overview',
  }),
  path: `/${ML_PAGES.OVERVIEW}`,
};

const ANOMALY_DETECTION_DEEP_LINK: AppDeepLink = {
  id: 'mlAnomalyDetectionSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.anomalyDetection', {
    defaultMessage: 'Anomaly Detection',
  }),
  path: `/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`,
};

const DATA_FRAME_ANALYTICS_DEEP_LINK: AppDeepLink = {
  id: 'mlDataFrameAnalyticsSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.dataFrameAnalytics', {
    defaultMessage: 'Data Frame Analytics',
  }),
  path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE}`,
  deepLinks: [
    {
      id: 'mlTrainedModelsSearchDeepLink',
      title: i18n.translate('xpack.ml.searchDeepLink.trainedModels', {
        defaultMessage: 'Trained Models',
      }),
      path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_MODELS_MANAGE}`,
    },
  ],
};

const DATA_VISUALIZER_DEEP_LINK: AppDeepLink = {
  id: 'mlDataVisualizerSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.dataVisualizer', {
    defaultMessage: 'Data Visualizer',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER}`,
};

const FILE_UPLOAD_DEEP_LINK: AppDeepLink = {
  id: 'mlFileUploadSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.fileUpload', {
    defaultMessage: 'File Upload',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER_FILE}`,
};

const INDEX_DATA_VISUALIZER_DEEP_LINK: AppDeepLink = {
  id: 'mlIndexDataVisualizerSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.indexDataVisualizer', {
    defaultMessage: 'Index Data Visualizer',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER_INDEX_SELECT}`,
};

const SETTINGS_DEEP_LINK: AppDeepLink = {
  id: 'mlSettingsSearchDeepLink',
  title: i18n.translate('xpack.ml.searchDeepLink.settings', {
    defaultMessage: 'Settings',
  }),
  path: `/${ML_PAGES.SETTINGS}`,
  deepLinks: [
    {
      id: 'mlCalendarSettingsSearchDeepLink',
      title: i18n.translate('xpack.ml.searchDeepLink.calendarSettings', {
        defaultMessage: 'Calendars',
      }),
      path: `/${ML_PAGES.CALENDARS_MANAGE}`,
    },
    {
      id: 'mlFilterListsSettingsSearchDeepLink',
      title: i18n.translate('xpack.ml.searchDeepLink.filterListsSettings', {
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
      SETTINGS_DEEP_LINK
    );
  }

  return deepLinks;
}
