/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, Logger } from 'kibana/server';
import { EndpointAuthz } from '../../../common/endpoint/types/authz';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import { EndpointAuthorizationError } from '../errors';

/**
 * Wraps an API route handler and handles authorization checks for endpoint related
 * apis.
 * @param requiredAuthz
 * @param routeHandler
 * @param logger
 */
export const withEndpointAuthz = <T>(
  requiredAuthz: Array<keyof EndpointAuthz>,
  routeHandler: T,
  logger?: Logger
): T => {
  const enforceAuthz = requiredAuthz.length > 0;

  if (!enforceAuthz && logger) {
    logger.warn(`Authorization disabled for API route: ${new Error('').stack ?? '?'}`);
  }

  const handlerWrapper: RequestHandler<
    unknown,
    unknown,
    unknown,
    SecuritySolutionRequestHandlerContext
  > = async (context, request, response) => {
    if (enforceAuthz) {
      const endpointAuthz = context.securitySolution.endpointAuthz;

      if (!requiredAuthz.every((permission) => endpointAuthz[permission])) {
        return response.forbidden({
          body: new EndpointAuthorizationError({ required: [...requiredAuthz] }),
        });
      }
    }

    // Authz is good call the route handler
    return (routeHandler as unknown as RequestHandler)(context, request, response);
  };

  return handlerWrapper as unknown as T;
};
