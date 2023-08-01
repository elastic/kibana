/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';

export const SecurityPagePath = {
  [SecurityPageName.mlLanding]: '/ml',
  [SecurityPageName.assets]: '/assets',
} as const;

export enum ExternalPageName {
  // Machine Learning
  // Ref: packages/default-nav/ml/default_navigation.ts
  mlOverview = 'ml:overview',
  mlNotifications = 'ml:notifications',
  mlAnomalyDetection = 'ml:anomalyDetection',
  mlAnomalyExplorer = 'ml:anomalyExplorer',
  mlSingleMetricViewer = 'ml:singleMetricViewer',
  mlSettings = 'ml:settings',
  mlDataFrameAnalytics = 'ml:dataFrameAnalytics',
  mlResultExplorer = 'ml:resultExplorer',
  mlAnalyticsMap = 'ml:analyticsMap',
  mlNodesOverview = 'ml:nodesOverview',
  mlNodes = 'ml:nodes',
  mlFileUpload = 'ml:fileUpload',
  mlIndexDataVisualizer = 'ml:indexDataVisualizer',
  mlExplainLogRateSpikes = 'ml:explainLogRateSpikes',
  mlLogPatternAnalysis = 'ml:logPatternAnalysis',
  mlChangePointDetections = 'ml:changePointDetections',
  // Dev Tools
  // Ref: packages/default-nav/devtools/default_navigation.ts
  devToolsRoot = 'dev_tools:',
}
