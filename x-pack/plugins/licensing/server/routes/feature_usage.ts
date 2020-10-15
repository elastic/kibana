/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, StartServicesAccessor } from 'src/core/server';
import { LicensingPluginStart } from '../types';

export function registerFeatureUsageRoute(
  router: IRouter,
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
