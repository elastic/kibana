/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { Request, ResponseToolkit, Server } from 'hapi';
import { flatten, map, uniq } from 'lodash';

interface KbnServer extends Server {
  getHiddenUiAppById: (appId: string) => any;
}

export function initSecurityOnPostAuthRequestInterceptor(server: KbnServer) {
  const features = server.plugins.xpack_main.getFeatures();
  const allApplications: string[] = uniq(flatten(map(features, feature => feature.app)));

  server.ext('onPostAuth', async function onPostAuthSecurityInterceptor(
    req: Request,
    h: ResponseToolkit
  ) {
    const path = req.path;

    const {
      actions,
      checkPrivilegesDynamicallyWithRequest,
      mode,
    } = server.plugins.security.authorization;

    // if we don't have a license enabling security, or we're a legacy user, don't validate this request
    if (!mode.useRbac()) {
      return h.continue;
    }

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(req);

    // Enforce app restrictions
    if (path.startsWith('/app/')) {
      const appId = path.split('/', 3)[2];
      const appAction = actions.app.get(appId);

      const isAppRegistered = allApplications.indexOf(appId.toLowerCase()) >= 0;

      if (isAppRegistered) {
        const checkPrivilegesResponse = await checkPrivileges(appAction);
        if (!checkPrivilegesResponse.hasAllRequested) {
          return Boom.notFound();
        }
      }
    }

    // Enforce API restrictions for associated applications
    if (path.startsWith('/api/')) {
      const { tags = [] } = req.route.settings;

      const actionTags = tags.filter(tag => tag.startsWith('access:'));

      if (actionTags.length > 0) {
        const feature = path.split('/', 3)[2];
        const apiActions = actionTags.map(tag =>
          actions.api.get(`${feature}/${tag.split(':', 2)[1]}`)
        );

        const checkPrivilegesResponse = await checkPrivileges(apiActions);
        if (!checkPrivilegesResponse.hasAllRequested) {
          return Boom.notFound();
        }
      }
    }

    return h.continue;
  });
}
