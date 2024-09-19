/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';
import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';
import { upsertUIReindexOption } from '../lib/telemetry/es_ui_reindex_apis';
import { RouteDependencies } from '../types';

export function registerTelemetryRoutes({ router, getSavedObjectsService }: RouteDependencies) {
  router.put(
    {
      path: `${API_BASE_PATH}/stats/ui_open`,
      validate: {
        body: schema.object({
          overview: schema.boolean({ defaultValue: false }),
          elasticsearch: schema.boolean({ defaultValue: false }),
          kibana: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (ctx, request, response) => {
      const { elasticsearch, overview, kibana } = request.body;
      return response.ok({
        body: await upsertUIOpenOption({
          savedObjects: getSavedObjectsService(),
          elasticsearch,
          overview,
          kibana,
        }),
      });
    }
  );

  router.put(
    {
      path: `${API_BASE_PATH}/stats/ui_reindex`,
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
      return response.ok({
        body: await upsertUIReindexOption({
          savedObjects: getSavedObjectsService(),
          close,
          open,
          start,
          stop,
        }),
      });
    }
  );
}
