/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { overviewRouteFactory } from './overview';
export { jobListRouteFactory } from './jobs_list';
export {
  indexOrSearchRouteFactory,
  dataVizIndexOrSearchRouteFactory,
  logRateAnalysisIndexOrSearchRouteFactory,
  explainLogRateSpikesIndexOrSearchRouteFactory,
  logCategorizationIndexOrSearchRouteFactory,
  changePointDetectionIndexOrSearchRouteFactory,
  jobTypeRouteFactory,
  newJobRouteFactory,
  singleMetricRouteFactory,
  multiMetricRouteFactory,
  multiMetricRouteFactoryRedirect,
  populationRouteFactory,
  advancedRouteFactory,
  advancedRouteFactoryRedirect,
  categorizationRouteFactory,
  rareRouteFactory,
  geoRouteFactory,
  recognizeRouteFactory,
  checkViewOrCreateRouteFactory,
  fromLensRouteFactory,
  fromMapRouteFactory,
  fromPatternAnalysisRouteFactory,
} from './new_job';
export {
  selectorRouteFactory,
  dataDriftRouteIndexOrSearchFactory,
  dataDriftRouteFactory,
  indexBasedRouteFactory,
  indexESQLBasedRouteFactory,
  fileBasedRouteFactory,
} from './datavisualizer';
export {
  settingsRouteFactory,
  calendarListRouteFactory,
  newCalendarRouteFactory,
  editCalendarRouteFactory,
  filterListRouteFactory,
  newFilterListRouteFactory,
  editFilterListRouteFactory,
} from './settings';
export {
  analyticsJobsListRouteFactory,
  analyticsJobExplorationRouteFactory,
  analyticsJobsCreationRouteFactory,
  analyticsMapRouteFactory,
  analyticsSourceSelectionRouteFactory,
} from './data_frame_analytics';
export {
  explainLogRateSpikesRouteFactory,
  logRateAnalysisRouteFactory,
  logCategorizationRouteFactory,
  changePointDetectionRouteFactory,
} from './aiops';
export { timeSeriesExplorerRouteFactory } from './timeseriesexplorer';
export { explorerRouteFactory } from './explorer';
export { modelsListRouteFactory } from './trained_models';
export { notificationsRouteFactory } from './notifications';
export { nodesListRouteFactory } from './memory_usage';
