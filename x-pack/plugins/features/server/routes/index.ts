/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { FeaturesPluginRouter } from '../types';
import { FeatureRegistry } from '../feature_registry';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: FeaturesPluginRouter;
  featureRegistry: FeatureRegistry;
}

export function defineRoutes({ router, featureRegistry }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/features',
      options: { tags: ['access:features'] },
      validate: {
        query: schema.object({ ignoreValidLicenses: schema.boolean({ defaultValue: false }) }),
      },
    },
    async (context, request, response) => {
      const { license: currentLicense } = await context.licensing;

      const allFeatures = featureRegistry.getAllKibanaFeatures(
        currentLicense,
        request.query.ignoreValidLicenses
      );

      return response.ok({
        body: allFeatures
          .sort(
            (f1, f2) =>
              (f1.order ?? Number.MAX_SAFE_INTEGER) - (f2.order ?? Number.MAX_SAFE_INTEGER)
          )
          .map((feature) => feature.toRaw()),
      });
    }
  );
}
