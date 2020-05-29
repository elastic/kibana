/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { AlertsFactory } from '../../../../alerts';
import { RouteDependencies } from '../../../../types';

export function updateAlertsRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.put(
    {
      path: '/api/monitoring/v1/alert/{type}',
      options: { tags: ['access:monitoring'] },
      validate: {
        params: schema.object({
          type: schema.string(),
        }),
        body: schema.object({
          throttle: schema.maybe(schema.string()),
          params: schema.maybe(
            schema.recordOf(schema.string(), schema.oneOf([schema.string(), schema.number()]))
          ),
          action: schema.maybe(
            schema.object({
              id: schema.string(),
              actionTypeId: schema.string(),
              group: schema.string(),
              params: schema.recordOf(schema.string(), schema.any()),
            })
          ),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { type } = request.params;
        const { action, throttle, params } = request.body;
        const alertsClient = context.alerting?.getAlertsClient();
        if (!alertsClient || !type) {
          return response.notFound();
        }

        if (!action && !throttle && !params) {
          return response.notFound();
        }

        const alert = await AlertsFactory.getByType(type, alertsClient);
        if (!alert) {
          return response.notFound();
        }

        if (action) {
          await alert.updateOrAddAction(alertsClient, action);
        } else if (throttle) {
          await alert.updateThrottle(alertsClient, throttle);
        } else if (params) {
          await alert.updateParams(alertsClient, params);
        }
        return response.ok({ body: alert.serialize() });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
