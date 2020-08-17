/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../types';

import { registerIndexRoutes } from './api/index';
import { registerNodesRoutes } from './api/nodes';
import { registerPoliciesRoutes } from './api/policies';
import { registerTemplatesRoutes } from './api/templates';
import { registerSnapshotPoliciesRoutes } from './api/snapshot_policies';

export function registerApiRoutes(dependencies: RouteDependencies) {
  registerIndexRoutes(dependencies);
  registerNodesRoutes(dependencies);
  registerPoliciesRoutes(dependencies);
  registerTemplatesRoutes(dependencies);
  registerSnapshotPoliciesRoutes(dependencies);
}
