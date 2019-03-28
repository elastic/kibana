/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, ResponseToolkit, Server } from 'hapi';
import { AuthorizationService } from './service';

export function initAppAuthorization(server: Server, authorization: AuthorizationService) {
  const { actions, checkPrivilegesDynamicallyWithRequest, mode } = authorization;

  server.ext('onPostAuth', async (request: Request, h: ResponseToolkit) => {
    const { path } = request;
    // if the path doesn't start with "/app/" or we aren't using RBAC for this request, just continue
    if (!path.startsWith('/app/') || !mode.useRbacForRequest(request)) {
      return h.continue;
    }

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);

    const appId = path.split('/', 3)[2];
    const appAction = actions.app.get(appId);

    const checkPrivilegesResponse = await checkPrivileges(appAction);
    if (checkPrivilegesResponse.hasAllRequested) {
      return h.continue;
    }

    return Boom.notFound();
  });
}
