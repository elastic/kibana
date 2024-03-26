/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  indexOrSearchRouteFactory,
  dataVizIndexOrSearchRouteFactory,
  logRateAnalysisIndexOrSearchRouteFactory,
  explainLogRateSpikesIndexOrSearchRouteFactory,
  logCategorizationIndexOrSearchRouteFactory,
  changePointDetectionIndexOrSearchRouteFactory,
} from './index_or_search';
export { jobTypeRouteFactory } from './job_type';
export { newJobRouteFactory } from './new_job';
export {
  singleMetricRouteFactory,
  multiMetricRouteFactory,
  multiMetricRouteFactoryRedirect,
  populationRouteFactory,
  advancedRouteFactory,
  advancedRouteFactoryRedirect,
  categorizationRouteFactory,
  rareRouteFactory,
  geoRouteFactory,
} from './wizard';
export { recognizeRouteFactory, checkViewOrCreateRouteFactory } from './recognize';
export { fromLensRouteFactory } from './from_lens';
export { fromMapRouteFactory } from './from_map';
export { fromPatternAnalysisRouteFactory } from './from_pattern_analysis';
