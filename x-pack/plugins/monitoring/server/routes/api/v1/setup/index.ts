/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { clusterSetupStatusRoute } from './cluster_setup_status';
import { disableElasticsearchInternalCollectionRoute } from './disable_elasticsearch_internal_collection';
import { nodeSetupStatusRoute } from './node_setup_status';

export function registerV1SetupRoutes(server: MonitoringCore) {
  clusterSetupStatusRoute(server);
  disableElasticsearchInternalCollectionRoute(server);
  nodeSetupStatusRoute(server);
}
