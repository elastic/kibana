/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, ResponseToolkit, Server } from 'hapi';
import { flatten } from 'lodash';
import { XPackMainPlugin } from 'x-pack/plugins/xpack_main/xpack_main';
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

  server.ext('onPostAuth', async (request: Request, h: ResponseToolkit) => {
    const { path } = request;
    // if the path doesn't start with "/app/" or we aren't using RBAC for this request, just continue
    if (!path.startsWith('/app/') || !mode.useRbacForRequest(request)) {
      return h.continue;
    }

    const appId = path.split('/', 3)[2];

    if (!protectedApplications.shouldProtect(appId)) {
      return h.continue;
    }

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const appAction = actions.app.get(appId);
    const checkPrivilegesResponse = await checkPrivileges(appAction);

    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      return h.continue;
    }

    return Boom.notFound();
  });
}
