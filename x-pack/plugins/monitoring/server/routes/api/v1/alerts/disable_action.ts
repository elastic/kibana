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

export function disableAlertActionRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.delete(
    {
      path: '/api/monitoring/v1/alert/{type}/action/{actionId}',
      options: { tags: ['access:monitoring'] },
      validate: {
        params: schema.object({
          type: schema.string(),
          actionId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { type, actionId } = request.params;
        const alertsClient = context.alerting?.getAlertsClient();
        if (!alertsClient || !actionId || !type) {
          return response.notFound();
        }

        const alert = await AlertsFactory.getByType(type, alertsClient);
        if (!alert) {
          return response.notFound();
        }

        await alert.disableAction(alertsClient, actionId);
        return response.ok({ body: { alert }});
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
