/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName, LinkCategoryType } from '@kbn/security-solution-navigation';
import { SERVER_APP_ID } from '@kbn/security-solution-plugin/common';
import type { LinkItem } from '@kbn/security-solution-plugin/public';
import { ExternalPageName, SecurityPagePath } from '../constants';
import type { ProjectLinkCategory, ProjectNavigationLink } from '../types';
import * as i18n from './translations';
import {
  IconLensLazy,
  IconEndpointLazy,
  IconSpacesLazy,
  IconIndexManagementLazy,
  IconDataConnectorLazy,
  IconDevToolsLazy,
  IconFleetLazy,
  IconAuditbeatLazy,
  IconSiemLazy,
} from '../../../common/lazy_icons';

// appLinks configures the Security Solution pages links
export const assetsAppLink: LinkItem = {
  id: SecurityPageName.assets,
  title: 'Assets', // i18n,
  path: SecurityPagePath[SecurityPageName.assets],
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: ['assets'], // i18n,
  hideTimeline: true,
  skipUrlState: true,
  links: [],
};

// navLinks define the navigation links for the Security Solution pages and External pages as well
export const assetsNavLinks: ProjectNavigationLink[] = [
  {
    id: ExternalPageName.mlOverview,
    title: i18n.OVERVIEW_TITLE,
    landingIcon: IconLensLazy,
    description: i18n.OVERVIEW_DESC,
  },
  {
    id: ExternalPageName.mlNotifications,
    title: i18n.NOTIFICATIONS_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.NOTIFICATIONS_DESC,
  },
  {
    id: ExternalPageName.mlAnomalyDetection,
    title: i18n.ANOMALY_DETECTION_TITLE,
    landingIcon: IconSpacesLazy,
    description: i18n.ANOMALY_DETECTION_DESC,
  },
  {
    id: ExternalPageName.mlAnomalyExplorer,
    title: i18n.ANOMALY_EXPLORER_TITLE,
    landingIcon: IconIndexManagementLazy,
    description: i18n.ANOMALY_EXPLORER_DESC,
  },
  {
    id: ExternalPageName.mlSingleMetricViewer,
    title: i18n.SINGLE_METRIC_VIEWER_TITLE,
    landingIcon: IconDataConnectorLazy,
    description: i18n.SINGLE_METRIC_VIEWER_DESC,
  },
  {
    id: ExternalPageName.mlSettings,
    title: i18n.SETTINGS_TITLE,
    landingIcon: IconDevToolsLazy,
    description: i18n.SETTINGS_DESC,
  },
  {
    id: ExternalPageName.mlDataFrameAnalytics,
    title: i18n.DATA_FRAME_ANALYTICS_TITLE,
    landingIcon: IconIndexManagementLazy,
    description: i18n.DATA_FRAME_ANALYTICS_DESC,
  },
  {
    id: ExternalPageName.mlResultExplorer,
    title: i18n.RESULT_EXPLORER_TITLE,
    landingIcon: IconFleetLazy,
    description: i18n.RESULT_EXPLORER_DESC,
  },
  {
    id: ExternalPageName.mlAnalyticsMap,
    title: i18n.ANALYTICS_MAP_TITLE,
    landingIcon: IconAuditbeatLazy,
    description: i18n.ANALYTICS_MAP_DESC,
  },
  {
    id: ExternalPageName.mlNodesOverview,
    title: i18n.NODES_OVERVIEW_TITLE,
    landingIcon: IconSiemLazy,
    description: i18n.NODES_OVERVIEW_DESC,
  },
  {
    id: ExternalPageName.mlNodes,
    title: i18n.NODES_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.NODES_DESC,
  },
  {
    id: ExternalPageName.mlFileUpload,
    title: i18n.FILE_UPLOAD_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.FILE_UPLOAD_DESC,
  },
  {
    id: ExternalPageName.mlIndexDataVisualizer,
    title: i18n.INDEX_DATA_VISUALIZER_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.INDEX_DATA_VISUALIZER_DESC,
  },
  {
    id: ExternalPageName.mlExplainLogRateSpikes,
    title: i18n.EXPLAIN_LOG_RATE_SPIKES_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.EXPLAIN_LOG_RATE_SPIKES_DESC,
  },
  {
    id: ExternalPageName.mlLogPatternAnalysis,
    title: i18n.LOG_PATTERN_ANALYSIS_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.LOG_PATTERN_ANALYSIS_DESC,
  },
  {
    id: ExternalPageName.mlChangePointDetections,
    title: i18n.CHANGE_POINT_DETECTIONS_TITLE,
    landingIcon: IconEndpointLazy,
    description: i18n.CHANGE_POINT_DETECTIONS_DESC,
  },
];
