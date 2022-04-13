/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, Logger } from 'kibana/server';
import type { EndpointAuthzKeyList } from '../../../common/endpoint/types/authz';
import type { SecuritySolutionRequestHandlerContext } from '../../types';
import { EndpointAuthorizationError } from '../errors';

/**
 * Interface for defining the needed permissions to access an API. Both sets of permissions (if defined) will
 * be `AND` together.
 */
export interface EndpointApiNeededAuthz {
  /* A list of authorization keys that ALL needed to be allowed */
  all?: EndpointAuthzKeyList;

  /* A list of authorization keys where at least one must be allowed */
  any?: EndpointAuthzKeyList;
}

/**
 * Wraps an API route handler and handles authorization checks for endpoint related
 * apis.
 * @param neededAuthz
 * @param routeHandler
 * @param logger
 */
export const withEndpointAuthz = <T>(
  neededAuthz: EndpointApiNeededAuthz,
  logger: Logger,
  routeHandler: T
): T => {
  const needAll: EndpointAuthzKeyList = neededAuthz.all ?? [];
  const needAny: EndpointAuthzKeyList = neededAuthz.any ?? [];
  const validateAll = needAll.length > 0;
  const validateAny = needAny.length > 0;
  const enforceAuthz = validateAll || validateAny;

  if (!enforceAuthz) {
    logger.warn(`Authorization disabled for API route: ${new Error('').stack ?? '?'}`);
  }

  const handlerWrapper: RequestHandler<
    unknown,
    unknown,
    unknown,
    SecuritySolutionRequestHandlerContext
  > = async (context, request, response) => {
    if (enforceAuthz) {
      const endpointAuthz = (await context.securitySolution).endpointAuthz;
      const permissionChecker = (permission: EndpointAuthzKeyList[0]) => endpointAuthz[permission];

      // has `all`?
      if (validateAll && !needAll.every(permissionChecker)) {
        return response.forbidden({
          body: new EndpointAuthorizationError({ need_all: [...needAll] }),
        });
      }

      // has `any`?
      if (validateAny && !needAny.some(permissionChecker)) {
        return response.forbidden({
          body: new EndpointAuthorizationError({ need_any: [...needAny] }),
        });
      }
    }

    // Authz is good call the route handler
    return (routeHandler as unknown as RequestHandler)(context, request, response);
  };

  return handlerWrapper as unknown as T;
};
