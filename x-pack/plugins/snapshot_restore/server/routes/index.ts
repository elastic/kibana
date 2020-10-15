/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RouteDependencies } from '../types';
import { registerAppRoutes } from './api/app';
import { registerRepositoriesRoutes } from './api/repositories';
import { registerSnapshotsRoutes } from './api/snapshots';
import { registerRestoreRoutes } from './api/restore';
import { registerPolicyRoutes } from './api/policy';

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
