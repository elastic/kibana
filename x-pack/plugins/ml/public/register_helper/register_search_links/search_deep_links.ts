/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LinkId } from '@kbn/deeplinks-ml';

import type { AppDeepLink } from '@kbn/core/public';
import { ML_PAGES } from '../../../common/constants/locator';

const OVERVIEW_LINK_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'overview',
  title: i18n.translate('xpack.ml.deepLink.overview', {
    defaultMessage: 'Overview',
  }),
  path: `/${ML_PAGES.OVERVIEW}`,
};

const ANOMALY_DETECTION_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'anomalyDetection',
  title: i18n.translate('xpack.ml.deepLink.anomalyDetection', {
    defaultMessage: 'Anomaly Detection',
  }),
  path: `/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`,
  deepLinks: [
    {
      id: 'anomalyExplorer',
      title: i18n.translate('xpack.ml.deepLink.anomalyExplorer', {
        defaultMessage: 'Anomaly explorer',
      }),
      path: `/${ML_PAGES.ANOMALY_EXPLORER}`,
    },
    {
      id: 'singleMetricViewer',
      title: i18n.translate('xpack.ml.deepLink.singleMetricViewer', {
        defaultMessage: 'Single metric viewer',
      }),
      path: `/${ML_PAGES.SINGLE_METRIC_VIEWER}`,
    },
  ],
};

const DATA_FRAME_ANALYTICS_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'dataFrameAnalytics',
  title: i18n.translate('xpack.ml.deepLink.dataFrameAnalytics', {
    defaultMessage: 'Data Frame Analytics',
  }),
  path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE}`,
  deepLinks: [
    {
      id: 'resultExplorer',
      title: i18n.translate('xpack.ml.deepLink.resultExplorer', {
        defaultMessage: 'Results explorer',
      }),
      path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`,
    },
    {
      id: 'analyticsMap',
      title: i18n.translate('xpack.ml.deepLink.analyticsMap', {
        defaultMessage: 'Analytics map',
      }),
      path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_MAP}`,
    },
  ],
};

const AIOPS_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'aiOps',
  title: i18n.translate('xpack.ml.deepLink.aiOps', {
    defaultMessage: 'AIOps',
  }),
  // Default to the index select page for the explain log rate spikes since we don't have an AIops overview page
  path: `/${ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT}`,
  deepLinks: [
    {
      id: 'explainLogRateSpikes',
      title: i18n.translate('xpack.ml.deepLink.explainLogRateSpikes', {
        defaultMessage: 'Explain Log Rate Spikes',
      }),
      path: `/${ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT}`,
    },
    {
      id: 'logPatternAnalysis',
      title: i18n.translate('xpack.ml.deepLink.logPatternAnalysis', {
        defaultMessage: 'Log Pattern Analysis',
      }),
      path: `/${ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT}`,
    },
    {
      id: 'changePointDetections',
      title: i18n.translate('xpack.ml.deepLink.changePointDetection', {
        defaultMessage: 'Change Point Detection',
      }),
      path: `/${ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT}`,
    },
  ],
};

const MODEL_MANAGEMENT_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'modelManagement',
  title: i18n.translate('xpack.ml.deepLink.modelManagement', {
    defaultMessage: 'Model Management',
  }),
  path: `/${ML_PAGES.TRAINED_MODELS_MANAGE}`,
  deepLinks: [
    {
      id: 'nodesOverview',
      title: i18n.translate('xpack.ml.deepLink.trainedModels', {
        defaultMessage: 'Trained Models',
      }),
      path: `/${ML_PAGES.TRAINED_MODELS_MANAGE}`,
    },
    {
      id: 'nodes',
      title: i18n.translate('xpack.ml.deepLink.nodes', {
        defaultMessage: 'Nodes',
      }),
      path: `/${ML_PAGES.NODES}`,
    },
  ],
};

const MEMORY_USAGE_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'memoryUsage',
  title: i18n.translate('xpack.ml.deepLink.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  path: `/${ML_PAGES.MEMORY_USAGE}`,
};

const DATA_VISUALIZER_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'dataVisualizer',
  title: i18n.translate('xpack.ml.deepLink.dataVisualizer', {
    defaultMessage: 'Data Visualizer',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER}`,
};

const FILE_UPLOAD_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'fileUpload',
  title: i18n.translate('xpack.ml.deepLink.fileUpload', {
    defaultMessage: 'File Upload',
  }),
  keywords: ['CSV', 'JSON'],
  path: `/${ML_PAGES.DATA_VISUALIZER_FILE}`,
};

const INDEX_DATA_VISUALIZER_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'indexDataVisualizer',
  title: i18n.translate('xpack.ml.deepLink.indexDataVisualizer', {
    defaultMessage: 'Index Data Visualizer',
  }),
  path: `/${ML_PAGES.DATA_VISUALIZER_INDEX_SELECT}`,
};

const SETTINGS_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'settings',
  title: i18n.translate('xpack.ml.deepLink.settings', {
    defaultMessage: 'Settings',
  }),
  path: `/${ML_PAGES.SETTINGS}`,
  deepLinks: [
    {
      id: 'calendarSettings',
      title: i18n.translate('xpack.ml.deepLink.calendarSettings', {
        defaultMessage: 'Calendars',
      }),
      path: `/${ML_PAGES.CALENDARS_MANAGE}`,
    },
    {
      id: 'filterListsSettings',
      title: i18n.translate('xpack.ml.deepLink.filterListsSettings', {
        defaultMessage: 'Filter Lists',
      }),
      path: `/${ML_PAGES.SETTINGS}`, // Link to settings page as read only users cannot view filter lists.
    },
  ],
};

const NOTIFICATIONS_DEEP_LINK: AppDeepLink<LinkId> = {
  id: 'notifications',
  title: i18n.translate('xpack.ml.deepLink.notifications', {
    defaultMessage: 'Notifications',
  }),
  path: `/${ML_PAGES.NOTIFICATIONS}`,
};

export function getDeepLinks(isFullLicense: boolean) {
  const deepLinks: Array<AppDeepLink<LinkId>> = [
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
      MEMORY_USAGE_DEEP_LINK,
      SETTINGS_DEEP_LINK,
      AIOPS_DEEP_LINK,
      NOTIFICATIONS_DEEP_LINK
    );
  }

  return deepLinks;
}
