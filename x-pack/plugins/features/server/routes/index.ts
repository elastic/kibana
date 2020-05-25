/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import { FeatureRegistry } from '../feature_registry';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
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
    (context, request, response) => {
      const allFeatures = featureRegistry.getAll();

      return response.ok({
        body: allFeatures
          .filter(
            (feature) =>
              request.query.ignoreValidLicenses ||
              !feature.validLicenses ||
              !feature.validLicenses.length ||
              (context.licensing!.license.type &&
                feature.validLicenses.includes(context.licensing!.license.type))
          )
          .sort(
            (f1, f2) =>
              (f1.order ?? Number.MAX_SAFE_INTEGER) - (f2.order ?? Number.MAX_SAFE_INTEGER)
          )
          .map((feature) => feature.toRaw()),
      });
    }
  );
}
