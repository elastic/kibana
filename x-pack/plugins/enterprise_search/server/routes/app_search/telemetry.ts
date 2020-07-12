/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';
import { incrementUICounter } from '../../collectors/app_search/telemetry';

export function registerTelemetryRoute({
  router,
  getSavedObjectsService,
  log,
}: IRouteDependencies) {
  router.put(
    {
      path: '/api/app_search/telemetry',
      validate: {
        body: schema.object({
          action: schema.oneOf([
            schema.literal('viewed'),
            schema.literal('clicked'),
            schema.literal('error'),
          ]),
          metric: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      const { action, metric } = request.body;

      try {
        if (!getSavedObjectsService) throw new Error('Could not find Saved Objects service');

        return response.ok({
          body: await incrementUICounter({
            savedObjects: getSavedObjectsService(),
            uiAction: `ui_${action}`,
            metric,
          }),
        });
      } catch (e) {
        log.error(`App Search UI telemetry error: ${e instanceof Error ? e.stack : e.toString()}`);
        return response.internalError({ body: 'App Search UI telemetry failed' });
      }
    }
  );
}
