/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { LicensingRouter } from '../../types';

export function registerNotifyFeatureUsageRoute(router: LicensingRouter) {
  router.post(
    {
      path: '/internal/licensing/feature_usage/notify',
      validate: {
        body: schema.object({
          featureName: schema.string(),
          lastUsed: schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      const { featureName, lastUsed } = request.body;

      (await context.licensing).featureUsage.notifyUsage(featureName, lastUsed);

      return response.ok({
        body: {
          success: true,
        },
      });
    }
  );
}
