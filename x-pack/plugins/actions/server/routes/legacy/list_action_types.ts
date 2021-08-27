/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../../src/core/server/http/router/router';
import { BASE_ACTION_API_PATH } from '../../../common';
import type { ILicenseState } from '../../lib/license_state';
import { verifyApiAccess } from '../../lib/verify_api_access';
import type { ActionsRequestHandlerContext } from '../../types';

export const listActionTypesRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/list_action_types`,
      validate: {},
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.actions) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for actions' });
      }
      const actionsClient = context.actions.getActionsClient();
      return res.ok({
        body: await actionsClient.listTypes(),
      });
    })
  );
};
