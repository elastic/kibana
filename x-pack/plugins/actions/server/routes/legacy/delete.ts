/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '../../../../../../src/core/server/http/router/router';
import { BASE_ACTION_API_PATH } from '../../../common';
import { isErrorThatHandlesItsOwnResponse } from '../../lib/errors';
import type { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/verify_api_access';
import type { ActionsRequestHandlerContext } from '../../types';

const paramSchema = schema.object({
  id: schema.string(),
});

export const deleteActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ACTION_API_PATH}/action/{id}`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
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
