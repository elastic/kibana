/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../types';

import { registerIndicesRoutes } from './api/indices';
import { registerTemplateRoutes } from './api/templates';
import { registerMappingRoute } from './api/mapping';
import { registerSettingsRoutes } from './api/settings';
import { registerStatsRoute } from './api/stats';

export class ApiRoutes {
  setup(dependencies: RouteDependencies) {
    registerIndicesRoutes(dependencies);
    registerTemplateRoutes(dependencies);
    registerSettingsRoutes(dependencies);
    registerStatsRoute(dependencies);
    registerMappingRoute(dependencies);
  }

  start() {}
  stop() {}
}
