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
    // if we don't have a license enabling security, don't validate this request
    if (!mode.useRbac()) {
      return h.continue;
    }

    // Enforce API restrictions for associated applications
    if (request.path.startsWith('/api/')) {
      const { tags = [] } = request.route.settings;

      const tagPrefix = 'access:';
      const actionTags = tags.filter(tag => tag.startsWith(tagPrefix));

      if (actionTags.length > 0) {
        const apiActions = actionTags.map(tag => actions.api.get(tag.substring(tagPrefix.length)));

        const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
        const checkPrivilegesResponse = await checkPrivileges(apiActions);
        if (!checkPrivilegesResponse.hasAllRequested) {
          return Boom.notFound();
        }
      }
    }

    return h.continue;
  });
}
