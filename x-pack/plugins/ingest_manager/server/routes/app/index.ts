/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, RequestHandler } from 'src/core/server';
import { APP_API_ROUTES } from '../../constants';
import { appContextService } from '../../services';
import { CheckPermissionsResponse } from '../../../common';

export const getCheckPermissionsHandler: RequestHandler = async (context, request, response) => {
  const body: CheckPermissionsResponse = { success: true };
  try {
    const security = await appContextService.getSecurity();
    const user = security.authc.getCurrentUser(request);

    if (!user?.roles.includes('superuser')) {
      body.success = false;
      body.error = 'MISSING_SUPERUSER_ROLE';
      return response.ok({
        body,
      });
    }

    return response.ok({ body: { success: true } });
  } catch (e) {
    body.success = false;
    body.error = 'MISSING_SECURITY';
    return response.ok({
      body,
    });
  }
};

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: APP_API_ROUTES.CHECK_PERMISSIONS_PATTERN,
      validate: {},
      options: { tags: [] },
    },
    getCheckPermissionsHandler
  );
};
