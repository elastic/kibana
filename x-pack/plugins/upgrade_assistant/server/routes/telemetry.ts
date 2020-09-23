/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';
import { upsertUIReindexOption } from '../lib/telemetry/es_ui_reindex_apis';
import { RouteDependencies } from '../types';

export function registerTelemetryRoutes({ router, getSavedObjectsService }: RouteDependencies) {
  router.put(
    {
      path: '/api/upgrade_assistant/stats/ui_open',
      validate: {
        body: schema.object({
          overview: schema.boolean({ defaultValue: false }),
          cluster: schema.boolean({ defaultValue: false }),
          indices: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (ctx, request, response) => {
      const { cluster, indices, overview } = request.body;
      try {
        return response.ok({
          body: await upsertUIOpenOption({
            savedObjects: getSavedObjectsService(),
            cluster,
            indices,
            overview,
          }),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );

  router.put(
    {
      path: '/api/upgrade_assistant/stats/ui_reindex',
      validate: {
        body: schema.object({
          close: schema.boolean({ defaultValue: false }),
          open: schema.boolean({ defaultValue: false }),
          start: schema.boolean({ defaultValue: false }),
          stop: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (ctx, request, response) => {
      const { close, open, start, stop } = request.body;
      try {
        return response.ok({
          body: await upsertUIReindexOption({
            savedObjects: getSavedObjectsService(),
            close,
            open,
            start,
            stop,
          }),
        });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );
}
