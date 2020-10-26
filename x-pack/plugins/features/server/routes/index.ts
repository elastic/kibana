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
      const currentLicense = context.licensing!.license;

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
          .map((feature) => {
            const raw = feature.toRaw();
            if (!currentLicense || request.query.ignoreValidLicenses) {
              return raw;
            }

            raw.subFeatures?.forEach((subFeature) => {
              subFeature.privilegeGroups.forEach((group) => {
                group.privileges = group.privileges.filter(
                  (privilege) =>
                    !privilege.minimumLicense || currentLicense.hasAtLeast(privilege.minimumLicense)
                );
              });
            });

            return raw;
          }),
      });
    }
  );
}
