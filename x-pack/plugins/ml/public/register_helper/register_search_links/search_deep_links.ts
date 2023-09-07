/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LinkId } from '@kbn/deeplinks-ml';

import { type AppDeepLink, AppNavLinkStatus } from '@kbn/core/public';
import { ML_PAGES } from '../../../common/constants/locator';
import type { MlCapabilities } from '../../shared';

function getNavStatus(
  mlCapabilities: MlCapabilities,
  statusIfServerless: boolean
): AppNavLinkStatus | undefined {
  if (mlCapabilities.isADEnabled && mlCapabilities.isDFAEnabled && mlCapabilities.isNLPEnabled) {
    // if all features are enabled we can assume that we are not running in serverless mode.
    // returning default will not add the link to the nav menu, but the link will be registered for searching
    return AppNavLinkStatus.default;
  }

  return statusIfServerless ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden;
}

function getOverviewLinkDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'overview',
    title: i18n.translate('xpack.ml.deepLink.overview', {
      defaultMessage: 'Overview',
    }),
    path: `/${ML_PAGES.OVERVIEW}`,
    navLinkStatus: getNavStatus(mlCapabilities, false),
  };
}

function getAnomalyDetectionDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  const navLinkStatus = getNavStatus(mlCapabilities, mlCapabilities.isADEnabled);
  return {
    id: 'anomalyDetection',
    title: i18n.translate('xpack.ml.deepLink.anomalyDetection', {
      defaultMessage: 'Anomaly Detection',
    }),
    path: `/${ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE}`,
    navLinkStatus,
    deepLinks: [
      {
        id: 'anomalyExplorer',
        title: i18n.translate('xpack.ml.deepLink.anomalyExplorer', {
          defaultMessage: 'Anomaly explorer',
        }),
        path: `/${ML_PAGES.ANOMALY_EXPLORER}`,
        navLinkStatus,
      },
      {
        id: 'singleMetricViewer',
        title: i18n.translate('xpack.ml.deepLink.singleMetricViewer', {
          defaultMessage: 'Single metric viewer',
        }),
        path: `/${ML_PAGES.SINGLE_METRIC_VIEWER}`,
        navLinkStatus,
      },
    ],
  };
}

function getDataFrameAnalyticsDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  const navLinkStatus = getNavStatus(mlCapabilities, mlCapabilities.isDFAEnabled);
  return {
    id: 'dataFrameAnalytics',
    title: i18n.translate('xpack.ml.deepLink.dataFrameAnalytics', {
      defaultMessage: 'Data Frame Analytics',
    }),
    path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE}`,
    navLinkStatus,
    deepLinks: [
      {
        id: 'resultExplorer',
        title: i18n.translate('xpack.ml.deepLink.resultExplorer', {
          defaultMessage: 'Results explorer',
        }),
        path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION}`,
        navLinkStatus,
      },
      {
        id: 'analyticsMap',
        title: i18n.translate('xpack.ml.deepLink.analyticsMap', {
          defaultMessage: 'Analytics map',
        }),
        path: `/${ML_PAGES.DATA_FRAME_ANALYTICS_MAP}`,
        navLinkStatus,
      },
    ],
  };
}

function getAiopsDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  const navLinkStatus = getNavStatus(mlCapabilities, mlCapabilities.canUseAiops);
  return {
    id: 'aiOps',
    title: i18n.translate('xpack.ml.deepLink.aiOps', {
      defaultMessage: 'AIOps',
    }),
    // Default to the index select page for log rate analysis since we don't have an AIops overview page
    path: `/${ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT}`,
    navLinkStatus,
    deepLinks: [
      {
        id: 'logRateAnalysis',
        title: i18n.translate('xpack.ml.deepLink.logRateAnalysis', {
          defaultMessage: 'Log Rate Analysis',
        }),
        path: `/${ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT}`,
        navLinkStatus,
      },
      {
        id: 'logPatternAnalysis',
        title: i18n.translate('xpack.ml.deepLink.logPatternAnalysis', {
          defaultMessage: 'Log Pattern Analysis',
        }),
        path: `/${ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT}`,
        navLinkStatus,
      },
      {
        id: 'changePointDetections',
        title: i18n.translate('xpack.ml.deepLink.changePointDetection', {
          defaultMessage: 'Change Point Detection',
        }),
        path: `/${ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT}`,
        navLinkStatus,
      },
    ],
  };
}

function getModelManagementDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  const navLinkStatus = getNavStatus(mlCapabilities, mlCapabilities.isNLPEnabled);
  return {
    id: 'modelManagement',
    title: i18n.translate('xpack.ml.deepLink.modelManagement', {
      defaultMessage: 'Model Management',
    }),
    path: `/${ML_PAGES.TRAINED_MODELS_MANAGE}`,
    navLinkStatus,
    deepLinks: [
      {
        id: 'nodesOverview',
        title: i18n.translate('xpack.ml.deepLink.trainedModels', {
          defaultMessage: 'Trained Models',
        }),
        path: `/${ML_PAGES.TRAINED_MODELS_MANAGE}`,
        navLinkStatus,
      },
      {
        id: 'nodes',
        title: i18n.translate('xpack.ml.deepLink.nodes', {
          defaultMessage: 'Nodes',
        }),
        path: `/${ML_PAGES.NODES}`,
        navLinkStatus: getNavStatus(mlCapabilities, false),
      },
    ],
  };
}

function getMemoryUsageDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'memoryUsage',
    title: i18n.translate('xpack.ml.deepLink.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
    path: `/${ML_PAGES.MEMORY_USAGE}`,
    navLinkStatus: getNavStatus(mlCapabilities, false),
  };
}

function getDataVisualizerDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'dataVisualizer',
    title: i18n.translate('xpack.ml.deepLink.dataVisualizer', {
      defaultMessage: 'Data Visualizer',
    }),
    path: `/${ML_PAGES.DATA_VISUALIZER}`,
    navLinkStatus: getNavStatus(mlCapabilities, false),
  };
}

function getFileUploadDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'fileUpload',
    title: i18n.translate('xpack.ml.deepLink.fileUpload', {
      defaultMessage: 'File Upload',
    }),
    keywords: ['CSV', 'JSON'],
    path: `/${ML_PAGES.DATA_VISUALIZER_FILE}`,
    navLinkStatus: getNavStatus(mlCapabilities, false),
  };
}

function getIndexDataVisualizerDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'indexDataVisualizer',
    title: i18n.translate('xpack.ml.deepLink.indexDataVisualizer', {
      defaultMessage: 'Index Data Visualizer',
    }),
    path: `/${ML_PAGES.DATA_VISUALIZER_INDEX_SELECT}`,
    navLinkStatus: getNavStatus(mlCapabilities, false),
  };
}

function getDataComparisonDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'dataComparison',
    title: i18n.translate('xpack.ml.deepLink.dataComparison', {
      defaultMessage: 'Data Comparison',
    }),
    path: `/${ML_PAGES.DATA_COMPARISON_INDEX_SELECT}`,
    navLinkStatus: getNavStatus(mlCapabilities, false),
  };
}

function getSettingsDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  const navLinkStatus = getNavStatus(mlCapabilities, mlCapabilities.isADEnabled);
  return {
    id: 'settings',
    title: i18n.translate('xpack.ml.deepLink.settings', {
      defaultMessage: 'Settings',
    }),
    path: `/${ML_PAGES.SETTINGS}`,
    navLinkStatus,
    deepLinks: [
      {
        id: 'calendarSettings',
        title: i18n.translate('xpack.ml.deepLink.calendarSettings', {
          defaultMessage: 'Calendars',
        }),
        path: `/${ML_PAGES.CALENDARS_MANAGE}`,
        navLinkStatus,
      },
      {
        id: 'filterListsSettings',
        title: i18n.translate('xpack.ml.deepLink.filterListsSettings', {
          defaultMessage: 'Filter Lists',
        }),
        path: `/${ML_PAGES.SETTINGS}`, // Link to settings page as read only users cannot view filter lists.
        navLinkStatus,
      },
    ],
  };
}

function getNotificationsDeepLink(mlCapabilities: MlCapabilities): AppDeepLink<LinkId> {
  return {
    id: 'notifications',
    title: i18n.translate('xpack.ml.deepLink.notifications', {
      defaultMessage: 'Notifications',
    }),
    path: `/${ML_PAGES.NOTIFICATIONS}`,
    navLinkStatus: getNavStatus(mlCapabilities, true),
  };
}

export function getDeepLinks(isFullLicense: boolean, mlCapabilities: MlCapabilities) {
  const deepLinks: Array<AppDeepLink<LinkId>> = [
    getDataVisualizerDeepLink(mlCapabilities),
    getFileUploadDeepLink(mlCapabilities),
    getIndexDataVisualizerDeepLink(mlCapabilities),
    getDataComparisonDeepLink(mlCapabilities),
  ];

  if (isFullLicense === true) {
    deepLinks.push(
      getOverviewLinkDeepLink(mlCapabilities),
      getAnomalyDetectionDeepLink(mlCapabilities),
      getDataFrameAnalyticsDeepLink(mlCapabilities),
      getModelManagementDeepLink(mlCapabilities),
      getMemoryUsageDeepLink(mlCapabilities),
      getSettingsDeepLink(mlCapabilities),
      getAiopsDeepLink(mlCapabilities),
      getNotificationsDeepLink(mlCapabilities)
    );
  }

  return deepLinks;
}
