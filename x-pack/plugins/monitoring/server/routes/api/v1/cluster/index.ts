/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { clusterRoute } from './cluster';
import { clustersRoute } from './clusters';

export function registerV1ClusterRoutes(server: MonitoringCore) {
  clusterRoute(server);
  clustersRoute(server);
}
