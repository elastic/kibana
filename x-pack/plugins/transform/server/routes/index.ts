/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { registerFieldHistogramsRoutes } from './api/field_histograms';
import { registerPrivilegesRoute } from './api/privileges';
import { registerTransformsRoutes } from './api/transforms';

export function registerRoutes(dependencies: RouteDependencies) {
  registerFieldHistogramsRoutes(dependencies);
  registerPrivilegesRoute(dependencies);
  registerTransformsRoutes(dependencies);
}
