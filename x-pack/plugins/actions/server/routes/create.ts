/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ActionResult, ActionsRequestHandlerContext } from '../types';
import { ILicenseState, verifyApiAccess, isErrorThatHandlesItsOwnResponse } from '../lib';
import { BASE_ACTION_API_PATH } from '../../common';

export const bodySchema = schema.object({
  name: schema.string(),
  actionTypeId: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const createActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/action`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
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
        if (isErrorThatHandlesItsOwnResponse(e)) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
