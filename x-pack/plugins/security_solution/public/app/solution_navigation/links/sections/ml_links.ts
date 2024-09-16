/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SecurityPageName,
  ExternalPageName,
  LinkCategoryType,
} from '@kbn/security-solution-navigation';
import { MACHINE_LEARNING_PATH } from '../../../../../common/constants';
import type { LinkItem } from '../../../../common/links/types';
import { SERVER_APP_ID } from '../../../../../common';
import type { SolutionLinkCategory, SolutionNavLink } from '../../../../common/links';
import {
  IconLensLazy,
  IconMarketingLazy,
  IconInfraLazy,
  IconFilebeatChartLazy,
  IconJobsLazy,
  IconKeywordLazy,
  IconDashboardLazy,
  IconVisualizationLazy,
  IconSettingsLazy,
  IconChartArrowLazy,
  IconManagerLazy,
  IconFilebeatLazy,
  IconReplicationLazy,
  IconDataViewLazy,
  IconIntuitiveLazy,
  IconRapidBarGraphLazy,
} from './lazy_icons';
import * as i18n from './ml_translations';

// appLinks configures the Security Solution pages links
export const mlAppLink: LinkItem = {
  id: SecurityPageName.mlLanding,
  title: i18n.ML_TITLE,
  path: MACHINE_LEARNING_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [i18n.ML_KEYWORD],
  hideTimeline: true,
  skipUrlState: true,
  links: [], // no security internal links
};

export const mlNavCategories: SolutionLinkCategory[] = [
  {
    type: LinkCategoryType.separator,
    linkIds: [
      ExternalPageName.mlOverview,
      ExternalPageName.mlNotifications,
      ExternalPageName.mlMemoryUsage,
    ],
  },
  {
    type: LinkCategoryType.title,
    label: i18n.ANOMALY_DETECTION_CATEGORY,
    linkIds: [
      ExternalPageName.mlAnomalyDetection,
      ExternalPageName.mlAnomalyExplorer,
      ExternalPageName.mlSingleMetricViewer,
      ExternalPageName.mlSuppliedConfigurations,
      ExternalPageName.mlSettings,
    ],
  },
  {
    type: LinkCategoryType.title,
    label: i18n.DATA_FRAME_ANALYTICS_CATEGORY,
    linkIds: [
      ExternalPageName.mlDataFrameAnalytics,
      ExternalPageName.mlResultExplorer,
      ExternalPageName.mlAnalyticsMap,
    ],
  },
  {
    type: LinkCategoryType.title,
    label: i18n.MODEL_MANAGEMENT_CATEGORY,
    linkIds: [ExternalPageName.mlNodesOverview],
  },
  {
    type: LinkCategoryType.title,
    label: i18n.DATA_VISUALIZER_CATEGORY,
    linkIds: [
      ExternalPageName.mlFileUpload,
      ExternalPageName.mlIndexDataVisualizer,
      ExternalPageName.mlESQLdataVisualizer,
      ExternalPageName.mlDataDrift,
    ],
  },
  {
    type: LinkCategoryType.title,
    label: i18n.AIOPS_LABS_CATEGORY,
    linkIds: [
      ExternalPageName.mlExplainLogRateSpikes,
      ExternalPageName.mlLogPatternAnalysis,
      ExternalPageName.mlChangePointDetections,
    ],
  },
];

// navLinks define the navigation links for the Security Solution pages and External pages as well
export const mlNavLinks: SolutionNavLink[] = [
  {
    id: ExternalPageName.mlOverview,
    title: i18n.OVERVIEW_TITLE,
    landingIcon: IconLensLazy,
    description: i18n.OVERVIEW_DESC,
  },
  {
    id: ExternalPageName.mlNotifications,
    title: i18n.NOTIFICATIONS_TITLE,
    landingIcon: IconMarketingLazy,
    description: i18n.NOTIFICATIONS_DESC,
  },
  {
    id: ExternalPageName.mlMemoryUsage,
    title: i18n.MEMORY_USAGE_TITLE,
    landingIcon: IconInfraLazy,
    description: i18n.MEMORY_USAGE_DESC,
  },
  {
    id: ExternalPageName.mlAnomalyDetection,
    title: i18n.ANOMALY_DETECTION_TITLE,
    landingIcon: IconJobsLazy,
    description: i18n.ANOMALY_DETECTION_DESC,
  },
  {
    id: ExternalPageName.mlAnomalyExplorer,
    title: i18n.ANOMALY_EXPLORER_TITLE,
    landingIcon: IconKeywordLazy,
    description: i18n.ANOMALY_EXPLORER_DESC,
  },
  {
    id: ExternalPageName.mlSingleMetricViewer,
    title: i18n.SINGLE_METRIC_VIEWER_TITLE,
    landingIcon: IconVisualizationLazy,
    description: i18n.SINGLE_METRIC_VIEWER_DESC,
  },
  {
    id: ExternalPageName.mlSuppliedConfigurations,
    title: i18n.SUPPLIED_CONFIGURATIONS_TITLE,
    landingIcon: IconJobsLazy,
    description: i18n.SUPPLIED_CONFIGURATIONS_DESC,
  },
  {
    id: ExternalPageName.mlSettings,
    title: i18n.SETTINGS_TITLE,
    landingIcon: IconSettingsLazy,
    description: i18n.SETTINGS_DESC,
  },
  {
    id: ExternalPageName.mlDataFrameAnalytics,
    title: i18n.DATA_FRAME_ANALYTICS_TITLE,
    landingIcon: IconJobsLazy,
    description: i18n.DATA_FRAME_ANALYTICS_DESC,
  },
  {
    id: ExternalPageName.mlResultExplorer,
    title: i18n.RESULT_EXPLORER_TITLE,
    landingIcon: IconDashboardLazy,
    description: i18n.RESULT_EXPLORER_DESC,
  },
  {
    id: ExternalPageName.mlAnalyticsMap,
    title: i18n.ANALYTICS_MAP_TITLE,
    landingIcon: IconChartArrowLazy,
    description: i18n.ANALYTICS_MAP_DESC,
  },
  {
    id: ExternalPageName.mlNodesOverview,
    title: i18n.NODES_OVERVIEW_TITLE,
    landingIcon: IconManagerLazy,
    description: i18n.NODES_OVERVIEW_DESC,
  },
  {
    id: ExternalPageName.mlFileUpload,
    title: i18n.FILE_UPLOAD_TITLE,
    landingIcon: IconFilebeatLazy,
    description: i18n.FILE_UPLOAD_DESC,
  },
  {
    id: ExternalPageName.mlIndexDataVisualizer,
    title: i18n.INDEX_DATA_VISUALIZER_TITLE,
    landingIcon: IconDataViewLazy,
    description: i18n.INDEX_DATA_VISUALIZER_DESC,
  },
  {
    id: ExternalPageName.mlESQLdataVisualizer,
    title: i18n.ESQL_DATA_VISUALIZER_TITLE,
    landingIcon: IconDataViewLazy,
    description: i18n.ESQL_DATA_VISUALIZER_DESC,
  },
  {
    id: ExternalPageName.mlDataDrift,
    title: i18n.DATA_DRIFT_TITLE,
    landingIcon: IconRapidBarGraphLazy,
    description: i18n.DATA_DRIFT_TITLE,
  },
  {
    id: ExternalPageName.mlExplainLogRateSpikes,
    title: i18n.LOG_RATE_ANALYSIS_TITLE,
    landingIcon: IconFilebeatChartLazy,
    description: i18n.LOG_RATE_ANALYSIS_DESC,
  },
  {
    id: ExternalPageName.mlLogPatternAnalysis,
    title: i18n.LOG_PATTERN_ANALYSIS_TITLE,
    landingIcon: IconReplicationLazy,
    description: i18n.LOG_PATTERN_ANALYSIS_DESC,
  },
  {
    id: ExternalPageName.mlChangePointDetections,
    title: i18n.CHANGE_POINT_DETECTIONS_TITLE,
    landingIcon: IconIntuitiveLazy,
    description: i18n.CHANGE_POINT_DETECTIONS_DESC,
  },
];
