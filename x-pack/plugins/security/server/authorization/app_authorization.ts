/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger } from '../../../../../src/core/server';
import { FeaturesService } from '../plugin';
import { Authorization } from '.';

class ProtectedApplications {
  private applications: Set<string> | null = null;
  constructor(private readonly featuresService: FeaturesService) {}

  public shouldProtect(appId: string) {
    // Currently, once we get the list of features we essentially "lock" additional
    // features from being added. This is enforced by the Features plugin. As such,
    // we wait until we actually need to consume these before getting them
    if (this.applications == null) {
      this.applications = new Set(
        this.featuresService
          .getFeatures()
          .map(feature => feature.app)
          .flat()
      );
    }

    return this.applications.has(appId);
  }
}

export function initAppAuthorization(
  http: CoreSetup['http'],
  {
    actions,
    checkPrivilegesDynamicallyWithRequest,
    mode,
  }: Pick<Authorization, 'actions' | 'checkPrivilegesDynamicallyWithRequest' | 'mode'>,
  logger: Logger,
  featuresService: FeaturesService
) {
  const protectedApplications = new ProtectedApplications(featuresService);

  http.registerOnPostAuth(async (request, response, toolkit) => {
    const path = request.url.pathname!;

    // if the path doesn't start with "/app/", just continue
    if (!path.startsWith('/app/')) {
      return toolkit.next();
    }

    // if we aren't using RBAC, just continue
    if (!mode.useRbacForRequest(request)) {
      return toolkit.next();
    }

    const appId = path.split('/', 3)[2];

    if (!protectedApplications.shouldProtect(appId)) {
      logger.debug(`not authorizing - "${appId}" isn't a protected application`);
      return toolkit.next();
    }

    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const appAction = actions.app.get(appId);
    const checkPrivilegesResponse = await checkPrivileges(appAction);

    logger.debug(`authorizing access to "${appId}"`);
    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      logger.debug(`authorized for "${appId}"`);
      return toolkit.next();
    }

    logger.debug(`not authorized for "${appId}"`);
    return response.notFound();
  });
}
