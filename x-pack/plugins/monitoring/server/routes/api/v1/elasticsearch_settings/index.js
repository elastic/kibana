/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { internalMonitoringCheckRoute } from './check/internal_monitoring';
export { clusterSettingsCheckRoute } from './check/cluster';
export { nodesSettingsCheckRoute } from './check/nodes';
export { setCollectionEnabledRoute } from './set/collection_enabled';
export { setCollectionIntervalRoute } from './set/collection_interval';
