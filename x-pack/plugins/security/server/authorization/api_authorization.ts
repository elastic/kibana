/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger } from '../../../../../src/core/server';
import { Authorization } from '.';

export function initAPIAuthorization(
  http: CoreSetup['http'],
  { actions, checkPrivilegesDynamicallyWithRequest, mode }: Authorization,
  logger: Logger
) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    // if the api doesn't start with "/api/" or we aren't using RBAC for this request, just continue
    if (!request.url.path!.startsWith('/api/') || !mode.useRbacForRequest(request)) {
      return toolkit.next();
    }

    const tags = request.route.options.tags;
    const tagPrefix = 'access:';
    const actionTags = tags.filter(tag => tag.startsWith(tagPrefix));

    // if there are no tags starting with "access:", just continue
    if (actionTags.length === 0) {
      logger.debug('API endpoint is not marked with "access:" tags, skipping.');
      return toolkit.next();
    }

    const apiActions = actionTags.map(tag => actions.api.get(tag.substring(tagPrefix.length)));
    const checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
    const checkPrivilegesResponse = await checkPrivileges(apiActions);

    // we've actually authorized the request
    if (checkPrivilegesResponse.hasAllRequested) {
      logger.debug(`authorized for "${request.url.path}"`);
      return toolkit.next();
    }

    logger.debug(`not authorized for "${request.url.path}"`);
    return response.notFound();
  });
}
