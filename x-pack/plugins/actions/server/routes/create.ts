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
import { ActionResult } from '../types';
import { extendRouteWithLicenseCheck } from '../extend_route_with_license_check';
import { LicenseState } from '../lib/license_state';

const bodySchema = schema.object({
  name: schema.string(),
  actionTypeId: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const createActionRoute = (router: IRouter, licenseState: LicenseState) => {
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
    router.handleLegacyErrors(
      extendRouteWithLicenseCheck(licenseState, async function(
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, TypeOf<typeof bodySchema>, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        const actionsClient = context.actions.getActionsClient();
        const action = req.body;
        const actionRes: ActionResult = await actionsClient.create({ action });
        return res.ok({
          body: actionRes,
        });
      })
    )
  );
};
