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
import { validateDurationSchema } from '../lib';
import { handleDisabledApiKeysError } from './lib/error_handler';
import { BASE_ALERT_API_PATH } from '../../common';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  actions: schema.arrayOf(
    schema.object({
      group: schema.string(),
      id: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
      actionTypeId: schema.maybe(schema.string()),
    }),
    { defaultValue: [] }
  ),
});

export const updateAlertRoute = (router: IRouter, licenseState: LicenseState) => {
  router.put(
    {
      path: `${BASE_ALERT_API_PATH}/alert/{id}`,
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        tags: ['access:alerting-all'],
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(async function (
        context: RequestHandlerContext,
        req: KibanaRequest<TypeOf<typeof paramSchema>, unknown, TypeOf<typeof bodySchema>>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse> {
        verifyApiAccess(licenseState);
        if (!context.alerting) {
          return res.badRequest({ body: 'RouteHandlerContext is not registered for alerting' });
        }
        const alertsClient = context.alerting.getAlertsClient();
        const { id } = req.params;
        const { name, actions, params, schedule, tags, throttle } = req.body;
        return res.ok({
          body: await alertsClient.update({
            id,
            data: { name, actions, params, schedule, tags, throttle },
          }),
        });
      })
    )
  );
};
