/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { ILicenseState } from '../lib/license_state';
import { verifyApiAccess } from '../lib/license_api_access';
import { BASE_ALERT_API_PATH } from '../../common';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';

const paramSchema = schema.object({
  id: schema.string(),
});

export const muteAllAlertRoute = (router: IRouter, licenseState: ILicenseState) => {
  router.post(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{id}/_mute_all`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: RequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      verifyApiAccess(licenseState);
      if (!context.alerting) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
      }
      const alertsClient = context.alerting.getAlertsClient();
      const { id } = req.params;
      try {
        await alertsClient.muteAll({ id });
        return res.noContent();
      } catch (e) {
        if (e instanceof AlertTypeDisabledError) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
