/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StartServicesAccessor } from '@kbn/core/server';
import { LicensingPluginStart } from '../types';
import { LicensingRouter } from '../types';

export function registerFeatureUsageRoute(
  router: LicensingRouter,
  getStartServices: StartServicesAccessor<{}, LicensingPluginStart>
) {
  router.get(
    { path: '/api/licensing/feature_usage', validate: false },
    async (context, request, response) => {
      const [, , { featureUsage }] = await getStartServices();
      return response.ok({
        body: {
          features: featureUsage.getLastUsages().map((usage) => ({
            name: usage.name,
            last_used: usage.lastUsed,
            license_level: usage.licenseType,
          })),
        },
      });
    }
  );
}
