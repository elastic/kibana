/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { LicenseType, LICENSE_TYPE } from '../../../common/types';
import { FeatureUsageServiceSetup } from '../../services';

export function registerRegisterFeatureRoute(
  router: IRouter,
  featureUsageSetup: FeatureUsageServiceSetup
) {
  router.post(
    {
      path: '/internal/licensing/feature_usage/register',
      validate: {
        body: schema.object({
          featureName: schema.string(),
          licenseType: schema.string({
            validate: (value) => {
              if (!(value in LICENSE_TYPE)) {
                return `Invalid license type: ${value}`;
              }
            },
          }),
        }),
      },
    },
    async (context, request, response) => {
      const { featureName, licenseType } = request.body;

      featureUsageSetup.register(featureName, licenseType as LicenseType);

      return response.ok({
        body: {
          success: true,
        },
      });
    }
  );
}
