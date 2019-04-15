/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, ResponseToolkit, Server } from 'hapi';
import { AuthorizationService } from './service';

export function initAPIAuthorization(server: Server, authorization: AuthorizationService) {
  const { actions, checkPrivilegesDynamicallyWithRequest, mode } = authorization;

  server.ext('onPostAuth', async (request: Request, h: ResponseToolkit) => {
    // if the api doesn't start with "/api/" or we aren't using RBAC for this request, just continue
    if (!request.path.startsWith('/api/') || !mode.useRbacForRequest(request)) {
      return h.continue;
    }

    const { tags = [] } = request.route.settings;
    const tagPrefix = 'access:';
    const actionTags = tags.filter(tag => tag.startsWith(tagPrefix));

    // if there are no tags starting with "access:", just continue
    if (actionTags.length === 0) {
      return h.continue;
    }

    const apiActions = actionTags.map(tag => actions.api.get(tag.substring(tagPrefix.length)));
    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const checkPrivilegesResponse = await checkPrivileges(apiActions);

    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      return h.continue;
    }

    return Boom.notFound();
  });
}
