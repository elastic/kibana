/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// all routes for the app
export { checkAccessRoute } from './check_access';
export * from './alerts/';
export { beatsDetailRoute, beatsListingRoute, beatsOverviewRoute } from './beats';
export { clusterRoute, clustersRoute } from './cluster';
export {
  esIndexRoute,
  esIndicesRoute,
  esNodeRoute,
  esNodesRoute,
  esOverviewRoute,
  mlJobRoute,
  ccrRoute,
  ccrShardRoute,
} from './elasticsearch';
export {
  internalMonitoringCheckRoute,
  clusterSettingsCheckRoute,
  nodesSettingsCheckRoute,
  setCollectionEnabledRoute,
  setCollectionIntervalRoute,
} from './elasticsearch_settings';
export { kibanaInstanceRoute, kibanaInstancesRoute, kibanaOverviewRoute } from './kibana';
export { apmInstanceRoute, apmInstancesRoute, apmOverviewRoute } from './apm';
export {
  logstashClusterPipelinesRoute,
  logstashNodePipelinesRoute,
  logstashNodeRoute,
  logstashNodesRoute,
  logstashOverviewRoute,
  logstashPipelineRoute,
  logstashClusterPipelineIdsRoute,
} from './logstash';
export { entSearchOverviewRoute } from './enterprise_search';
export * from './setup';
