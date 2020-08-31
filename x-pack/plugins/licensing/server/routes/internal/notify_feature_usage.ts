/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';

export function registerNotifyFeatureUsageRoute(router: IRouter) {
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

      context.licensing.featureUsage.notifyUsage(featureName, lastUsed);

      return response.ok({
        body: {
          success: true,
        },
      });
    }
  );
}
