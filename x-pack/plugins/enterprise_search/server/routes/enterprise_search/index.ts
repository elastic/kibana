/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../plugin';

import { registerDocumentRoute } from './documents';
import { registerEnginesRoutes } from './engines';
import { registerIndexRoutes } from './indices';
import { registerMappingRoute } from './mapping';
import { registerSearchRoute } from './search';

export const registerEnterpriseSearchRoutes = (dependencies: RouteDependencies) => {
  registerIndexRoutes(dependencies);
  registerMappingRoute(dependencies);
  registerSearchRoute(dependencies);
  registerDocumentRoute(dependencies);
  registerEnginesRoutes(dependencies);
};
