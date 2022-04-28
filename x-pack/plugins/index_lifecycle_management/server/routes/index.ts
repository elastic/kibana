/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { registerIndexRoutes } from './api/index/index';
import { registerNodesRoutes } from './api/nodes';
import { registerPoliciesRoutes } from './api/policies';
import { registerTemplatesRoutes } from './api/templates';
import { registerSnapshotPoliciesRoutes } from './api/snapshot_policies';
import { registerSnapshotRepositoriesRoutes } from './api/snapshot_repositories';

export function registerApiRoutes(dependencies: RouteDependencies) {
  registerIndexRoutes(dependencies);
  registerNodesRoutes(dependencies);
  registerPoliciesRoutes(dependencies);
  registerTemplatesRoutes(dependencies);
  registerSnapshotPoliciesRoutes(dependencies);
  registerSnapshotRepositoriesRoutes(dependencies);
}
