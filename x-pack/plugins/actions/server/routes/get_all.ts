/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { ILicenseState, verifyApiAccess } from '../lib';
import { BASE_ACTION_API_PATH } from '../../common';

export const getAllActionRoute = (router: IRouter, licenseState: ILicenseState) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}`,
      validate: {},
      options: {
        tags: ['access:actions-read'],
      },
    },
    router.handleLegacyErrors(async function (
      context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      verifyApiAccess(licenseState);
      if (!context.actions) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for actions' });
      }
      const actionsClient = context.actions.getActionsClient();
      const result = await actionsClient.getAll();
      return res.ok({
        body: result,
      });
    })
  );
};
