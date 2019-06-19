/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { callWithRequestFactory } from './call_with_request_factory';
import { isEsErrorFactory as createIsEsError } from './is_es_error_factory';
import { wrapEsError, wrapUnknownError } from './error_wrappers';
import { licensePreRoutingFactory } from'./license_pre_routing_factory';

export { wrapEsError, wrapUnknownError, wrapCustomError } from './error_wrappers';

// Sometimes consumers will need to check if errors are ES errors, too.
export const isEsErrorFactory = server => {
  return createIsEsError(server);
};

export const createRouter = (server, pluginId, apiBasePath = '') => {
  const isEsError = isEsErrorFactory(server);

  // NOTE: The license-checking logic depends on the xpack_main plugin, so if your plugin
  // consumes this helper, make sure it declares 'xpack_main' as a dependency.
  const licensePreRouting = licensePreRoutingFactory(server, pluginId);

  const requestHandler = (handler) => async (request, h) => {
    const callWithRequest = callWithRequestFactory(server, request);
    try {
      return await handler(request, callWithRequest, h);
    } catch (err) {
      if (err instanceof Boom) {
        throw err;
      }

      if (isEsError(err)) {
        throw wrapEsError(err);
      }

      throw wrapUnknownError(err);
    }
  };

  // Decorate base router with HTTP methods.
  return (['get', 'post', 'put', 'delete', 'patch'].reduce((router, methodName) => {
    router[methodName] = (subPath, handler) => {
      const method = methodName.toUpperCase();
      const path = `${apiBasePath}${subPath}`;
      server.route({
        path,
        method,
        handler: requestHandler(handler),
        config: { pre: [ licensePreRouting ] }
      });
    };
    return router;
  }, {}));
};
