/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, StartServicesAccessor } from 'src/core/server';
import { LicensingPluginStart } from '../types';
import { registerInfoRoute } from './info';
import { registerFeatureUsageRoute } from './feature_usage';

export function registerRoutes(
  router: IRouter,
  getStartServices: StartServicesAccessor<{}, LicensingPluginStart>
) {
  registerInfoRoute(router);
  registerFeatureUsageRoute(router, getStartServices);
}
