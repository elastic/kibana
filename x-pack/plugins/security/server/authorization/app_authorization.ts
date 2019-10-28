/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, ResponseToolkit, Server } from 'hapi';
import { flatten } from 'lodash';
import { XPackMainPlugin } from '../../../../xpack_main/xpack_main';
import { AuthorizationService } from './service';
class ProtectedApplications {
  private applications: Set<string> | null = null;
  constructor(private readonly xpackMainPlugin: XPackMainPlugin) {}

  public shouldProtect(appId: string) {
    // Currently, once we get the list of features we essentially "lock" additional
    // features from being added. This is enforced by the xpackMain plugin. As such,
    // we wait until we actually need to consume these before getting them
    if (this.applications == null) {
      this.applications = new Set(
        flatten(this.xpackMainPlugin.getFeatures().map(feature => feature.app))
      );
    }

    return this.applications.has(appId);
  }
}

export function initAppAuthorization(
  server: Server,
  xpackMainPlugin: XPackMainPlugin,
  authorization: AuthorizationService
) {
  const { actions, checkPrivilegesDynamicallyWithRequest, mode } = authorization;
  const protectedApplications = new ProtectedApplications(xpackMainPlugin);
  const log = (msg: string) => server.log(['security', 'app-authorization', 'debug'], msg);

  server.ext('onPostAuth', async (request: Request, h: ResponseToolkit) => {
    const { path } = request;
    // if the path doesn't start with "/app/", just continue
    if (!path.startsWith('/app/')) {
      return h.continue;
    }

    // if we aren't using RBAC, just continue
    if (!mode.useRbacForRequest(request)) {
      return h.continue;
    }

    const appId = path.split('/', 3)[2];

    if (!protectedApplications.shouldProtect(appId)) {
      log(`not authorizing - "${appId}" isn't a protected application`);
      return h.continue;
    }

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const appAction = actions.app.get(appId);
    const checkPrivilegesResponse = await checkPrivileges(appAction);

    log(`authorizing access to "${appId}"`);
    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      log(`authorized for "${appId}"`);
      return h.continue;
    }

    log(`not authorized for "${appId}"`);
    return Boom.notFound();
  });
}
