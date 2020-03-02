/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { LicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { AlertNavigationRegistry } from '../alert_navigation_registry/alert_navigation_registry';
import { AlertTypeRegistry } from '../alert_type_registry';

const paramSchema = schema.object({
  id: schema.string(),
  consumer: schema.string(),
});

export const getAlertNavigationRoute = (
  router: IRouter,
  licenseState: LicenseState,
  alertTypeRegistry: PublicMethodsOf<AlertTypeRegistry>,
  alertNavigationRegistry: PublicMethodsOf<AlertNavigationRegistry>
) => {
  router.get(
    {
      path: `/api/alert/{id}/consumer/{consumer}/navigation`,
      validate: {
        params: paramSchema,
      },
      options: {
        tags: ['access:alerting-read'],
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      verifyApiAccess(licenseState);
      const { id, consumer } = req.params;
      const alertsClient = context.alerting.getAlertsClient();
      const alert = await alertsClient.get({ id });
      const alertType = alertTypeRegistry.get(alert.alertTypeId);
      const navigationHandler = alertNavigationRegistry.get(consumer, alertType);
      const state = navigationHandler(alert, alertType);
      return res.ok({
        body: typeof state === 'string' ? { url: state } : { state },
      });
    })
  );
};
