/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpServiceSetup, Logger } from '../../../../../src/core/server';
import { AuthorizationServiceSetup } from '.';

export function initAPIAuthorization(
  http: HttpServiceSetup,
  { actions, checkPrivilegesDynamicallyWithRequest, mode }: AuthorizationServiceSetup,
  logger: Logger
) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    // if we aren't using RBAC for this request, just continue
    if (!mode.useRbacForRequest(request)) {
      return toolkit.next();
    }

    const tags = request.route.options.tags;
    const tagPrefix = 'access:';
    const actionTags = tags.filter((tag) => tag.startsWith(tagPrefix));

    // if there are no tags starting with "access:", just continue
    if (actionTags.length === 0) {
      return toolkit.next();
    }

    const apiActions = actionTags.map((tag) => actions.api.get(tag.substring(tagPrefix.length)));
    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const checkPrivilegesResponse = await checkPrivileges(apiActions);

    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      logger.debug(`User authorized for "${request.url.path}"`);
      return toolkit.next();
    }

    logger.warn(`User not authorized for "${request.url.path}": responding with 404`);
    return response.notFound();
  });
}
