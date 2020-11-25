/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../plugin';

import { registerEnginesRoutes } from './engines';
import { registerCredentialsRoutes } from './credentials';
import { registerSettingsRoutes } from './settings';

export const registerAppSearchRoutes = (dependencies: RouteDependencies) => {
  registerEnginesRoutes(dependencies);
  registerCredentialsRoutes(dependencies);
  registerSettingsRoutes(dependencies);
};
