/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { FeatureUsageTestStartDependencies, FeatureUsageTestPluginStart } from '../plugin';

import { registerFeatureHitRoute } from './hit';

export function registerRoutes(
  router: IRouter,
  getStartServices: StartServicesAccessor<
    FeatureUsageTestStartDependencies,
    FeatureUsageTestPluginStart
  >
) {
  registerFeatureHitRoute(router, getStartServices);
}
