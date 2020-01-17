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

export const listActionTypesRoute = (router: IRouter, licenseState: LicenseState) => {
  router.get(
    {
      path: `/api/action/types`,
      validate: {},
      options: {
        tags: ['access:actions-read'],
      },
    },
    router.handleLegacyErrors(
      extendRouteWithLicenseCheck(licenseState, async function(
        context: RequestHandlerContext,
        req: KibanaRequest<TypeOf<typeof paramSchema>, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        return res.ok({
          body: context.actions.listTypes(),
        });
      })
    )
  );
};
