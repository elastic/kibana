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
import { assertNever } from '../../../../../src/core/utils';
import { ActionResult } from '../types';
import { ActionTypeDisabledError, ILicenseState, verifyApiAccess } from '../lib';

export const bodySchema = schema.object({
  name: schema.string(),
  actionTypeId: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const createActionRoute = (router: IRouter, licenseState: ILicenseState) => {
  router.post(
    {
      path: `/api/action`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: ['access:actions-all'],
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, TypeOf<typeof bodySchema>, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      verifyApiAccess(licenseState);

      if (!context.actions) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for actions' });
      }
      const actionsClient = context.actions.getActionsClient();
      const action = req.body;
      try {
        const actionRes: ActionResult = await actionsClient.create({ action });
        return res.ok({
          body: actionRes,
        });
      } catch (e) {
        if (e instanceof ActionTypeDisabledError) {
          switch (e.reason) {
            case 'config':
              return res.badRequest({ body: { message: e.message } });
            case 'license_unavailable':
            case 'license_invalid':
            case 'license_expired':
              return res.forbidden({ body: { message: e.message } });
            default:
              assertNever(e.reason);
          }
        }
        throw e;
      }
    })
  );
};
