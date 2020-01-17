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

import { ActionExecutorContract } from '../lib';

// export function getExecuteActionRoute(actionExecutor: ActionExecutorContract) {
//   return {
//     config: {
//       response: {
//         emptyStatusCode: 204,
//       },
//     },
//   };
// }

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  params: schema.recordOf(schema.string(), schema.any()),
});

export const getExecuteActionRoute = (
  router: IRouter,
  licenseState: LicenseState,
  actionExecutor: ActionExecutorContract
) => {
  router.post(
    {
      path: '/api/action/{id}/_execute',
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        tags: ['access:actions-read'],
      },
    },
    router.handleLegacyErrors(
      extendRouteWithLicenseCheck(licenseState, async function(
        context: RequestHandlerContext,
        req: KibanaRequest<TypeOf<typeof paramSchema>, any, TypeOf<typeof bodySchema>, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        const { params } = req.body;
        const { id } = req.params;
        return res.ok({
          body: await actionExecutor.execute({
            params,
            request: req,
            actionId: id,
          }),
        });
      })
    )
  );
};
