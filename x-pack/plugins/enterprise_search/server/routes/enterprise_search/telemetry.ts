/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';
import { incrementUICounter } from '../../collectors/lib/telemetry';

import { ES_TELEMETRY_NAME } from '../../collectors/enterprise_search/telemetry';
import { AS_TELEMETRY_NAME } from '../../collectors/app_search/telemetry';
import { WS_TELEMETRY_NAME } from '../../collectors/workplace_search/telemetry';
const productToTelemetryMap = {
  enterprise_search: ES_TELEMETRY_NAME,
  app_search: AS_TELEMETRY_NAME,
  workplace_search: WS_TELEMETRY_NAME,
};

export function registerTelemetryRoute({
  router,
  getSavedObjectsService,
  log,
}: IRouteDependencies) {
  router.put(
    {
      path: '/api/enterprise_search/telemetry',
      validate: {
        body: schema.object({
          product: schema.oneOf([
            schema.literal('app_search'),
            schema.literal('workplace_search'),
            schema.literal('enterprise_search'),
          ]),
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
      const { product, action, metric } = request.body;

      try {
        if (!getSavedObjectsService) throw new Error('Could not find Saved Objects service');

        return response.ok({
          body: await incrementUICounter({
            id: productToTelemetryMap[product],
            savedObjects: getSavedObjectsService(),
            uiAction: `ui_${action}`,
            metric,
          }),
        });
      } catch (e) {
        log.error(
          `Enterprise Search UI telemetry error: ${e instanceof Error ? e.stack : e.toString()}`
        );
        return response.internalError({ body: 'Enterprise Search UI telemetry failed' });
      }
    }
  );
}
