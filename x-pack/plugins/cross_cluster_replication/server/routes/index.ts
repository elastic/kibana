/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../types';

import { registerAutoFollowPatternRoutes } from './api/auto_follow_pattern';
import { registerFollowerIndexRoutes } from './api/follower_index';
import { registerCrossClusterReplicationRoutes } from './api/cross_cluster_replication';

export function registerApiRoutes(dependencies: RouteDependencies) {
  registerAutoFollowPatternRoutes(dependencies);
  registerFollowerIndexRoutes(dependencies);
  registerCrossClusterReplicationRoutes(dependencies);
}
