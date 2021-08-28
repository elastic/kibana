/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StartServicesAccessor } from '../../../../../src/core/server';
import type { FeatureUsageServiceSetup } from '../services/feature_usage_service';
import type { LicensingPluginStart, LicensingRouter } from '../types';
import { registerFeatureUsageRoute } from './feature_usage';
import { registerInfoRoute } from './info';
import { registerNotifyFeatureUsageRoute } from './internal/notify_feature_usage';
import { registerRegisterFeatureRoute } from './internal/register_feature';

export function registerRoutes(
  router: LicensingRouter,
  featureUsageSetup: FeatureUsageServiceSetup,
  getStartServices: StartServicesAccessor<{}, LicensingPluginStart>
) {
  registerInfoRoute(router);
  registerFeatureUsageRoute(router, getStartServices);
  registerRegisterFeatureRoute(router, featureUsageSetup);
  registerNotifyFeatureUsageRoute(router);
}
