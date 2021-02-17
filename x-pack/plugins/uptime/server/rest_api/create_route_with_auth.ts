/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMServerLibs } from '../lib/lib';
import { UptimeRoute, UMRestApiRouteFactory, UMRouteHandler } from './types';

export const createRouteWithAuth = (
  libs: UMServerLibs,
  routeCreator: UMRestApiRouteFactory
): UptimeRoute => {
  const restRoute = routeCreator(libs);
  const { handler, method, path, options, ...rest } = restRoute;
  const licenseCheckHandler: UMRouteHandler = async ({
    uptimeEsClient,
    context,
    request,
    response,
    savedObjectsClient,
  }) => {
    const { statusCode, message } = libs.license(context.licensing.license);
    if (statusCode === 200) {
      return handler({
        uptimeEsClient,
        context,
        request,
        response,
        savedObjectsClient,
      });
    }
    switch (statusCode) {
      case 400:
        return response.badRequest({ body: { message } });
      case 401:
        return response.unauthorized({ body: { message } });
      case 403:
        return response.forbidden({ body: { message } });
      default:
        return response.internalError();
    }
  };

  return {
    method,
    path,
    options,
    handler: licenseCheckHandler,
    ...rest,
  };
};
