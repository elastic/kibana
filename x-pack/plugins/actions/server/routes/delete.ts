/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
import { extendRouteWithLicenseCheck } from '../extend_route_with_license_check';
import { LicenseState } from '../lib/license_state';

const paramSchema = schema.object({
  id: schema.string(),
});

export const deleteActionRoute = (router: IRouter, licenseState: LicenseState) => {
  router.delete(
    {
      path: `/api/action/{id}`,
      validate: {
        params: paramSchema,
      },
      options: {
        tags: ['access:actions-all'],
      },
    },
    router.handleLegacyErrors(
      extendRouteWithLicenseCheck(licenseState, async function(
        context: RequestHandlerContext,
        req: KibanaRequest<TypeOf<typeof paramSchema>, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        const actionsClient = context.actions.getActionsClient();
        const { id } = req.params;
        await actionsClient.delete({ id });
        return res.noContent();
      })
    )
  );
};
