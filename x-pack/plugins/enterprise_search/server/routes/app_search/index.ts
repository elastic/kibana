/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouteDependencies } from '../../plugin';

import { registerEnginesRoute } from './engines';
import { registerCredentialsRoutes } from './credentials';
import { registerSettingsRoutes } from './settings';

export const registerAppSearchRoutes = (dependencies: IRouteDependencies) => {
  registerEnginesRoute(dependencies);
  registerCredentialsRoutes(dependencies);
  registerSettingsRoutes(dependencies);
};
