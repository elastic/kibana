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
import { ILicenseState, verifyApiAccess, isErrorThatHandlesItsOwnResponse } from '../lib';
import { BASE_ACTION_API_PATH } from '../../common';

const paramSchema = schema.object({
  id: schema.string(),
});

export const deleteActionRoute = (router: IRouter, licenseState: ILicenseState) => {
  router.delete(
    {
      path: `${BASE_ACTION_API_PATH}/action/{id}`,
      validate: {
        params: paramSchema,
      },
      options: {
        tags: ['access:actions-all'],
      },
    },
    router.handleLegacyErrors(async function (
      context: RequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      verifyApiAccess(licenseState);
      if (!context.actions) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for actions' });
      }
      const actionsClient = context.actions.getActionsClient();
      const { id } = req.params;
      try {
        await actionsClient.delete({ id });
        return res.noContent();
      } catch (e) {
        if (isErrorThatHandlesItsOwnResponse(e)) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
