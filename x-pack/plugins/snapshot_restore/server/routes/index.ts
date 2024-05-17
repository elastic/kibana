/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';
import { registerAppRoutes } from './api/app';
import { registerPolicyRoutes } from './api/policy';
import { registerRepositoriesRoutes } from './api/repositories';
import { registerRestoreRoutes } from './api/restore';
import { registerSnapshotsRoutes } from './api/snapshots';

export class ApiRoutes {
  setup(dependencies: RouteDependencies) {
    registerAppRoutes(dependencies);
    registerRepositoriesRoutes(dependencies);
    registerSnapshotsRoutes(dependencies);
    registerRestoreRoutes(dependencies);

    if (dependencies.config.isSlmEnabled) {
      registerPolicyRoutes(dependencies);
    }
  }
}
