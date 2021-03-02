/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../plugin';

import { registerAnalyticsRoutes } from './analytics';
import { registerCredentialsRoutes } from './credentials';
import { registerCurationsRoutes } from './curations';
import { registerDocumentsRoutes, registerDocumentRoutes } from './documents';
import { registerEnginesRoutes } from './engines';
import { registerSearchSettingsRoutes } from './search_settings';
import { registerSettingsRoutes } from './settings';

export const registerAppSearchRoutes = (dependencies: RouteDependencies) => {
  registerEnginesRoutes(dependencies);
  registerCredentialsRoutes(dependencies);
  registerSettingsRoutes(dependencies);
  registerAnalyticsRoutes(dependencies);
  registerDocumentsRoutes(dependencies);
  registerDocumentRoutes(dependencies);
  registerCurationsRoutes(dependencies);
  registerSearchSettingsRoutes(dependencies);
};
