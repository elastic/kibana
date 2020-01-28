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

const paramSchema = schema.object({
  id: schema.string(),
});

export const bodySchema = schema.object({
  name: schema.string(),
  alertTypeId: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.nullable(schema.duration()),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string(), // replace with duration
  }),
  actions: schema.arrayOf(
    schema.object({
      id: schema.string(),
      group: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    })
  ),
});

export const updateAlertRoute = (router: IRouter, licenseState: LicenseState) => {
  router.put(
    {
      path: '/api/alert/{id}',
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        tags: ['access:actions-all'],
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, any, TypeOf<typeof bodySchema>, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      verifyApiAccess(licenseState);
      const alertsClient = context.alerting.getAlertsClient();
      const { id } = req.params;
      const { name, tags, schedule, params, actions } = req.body;
      return res.ok({
        body: await alertsClient.update({
          id,
          data: { name, tags, schedule, params, actions }, // throttle ??
        }),
      });
    })
  );
};
