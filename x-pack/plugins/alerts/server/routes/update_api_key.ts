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
import { BASE_ALERT_API_PATH } from '../../common';
import { handleDisabledApiKeysError } from './lib/error_handler';

const paramSchema = schema.object({
  id: schema.string(),
});

export const updateApiKeyRoute = (router: IRouter, licenseState: LicenseState) => {
  router.post(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{id}/_update_api_key`,
      validate: {
        params: paramSchema,
      },
      options: {
        tags: ['access:alerting-all'],
      },
    },
    handleDisabledApiKeysError(
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
        await alertsClient.updateApiKey({ id });
        return res.noContent();
      })
    )
  );
};
