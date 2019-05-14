/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { callWithRequestFactory } from './call_with_request_factory';
import { isEsErrorFactory } from './is_es_error_factory';
import { wrapEsError, wrapUnknownError } from './error_wrappers';
import { licensePreRoutingFactory } from'./license_pre_routing_factory';

export const createRouter = (server, pluginId, apiBasePath = '') => {
  const isEsError = isEsErrorFactory(server);
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

  return (['get', 'post', 'put', 'delete', 'patch'].reduce((router, method) => {
    router[method] = (path, handler) => {
      server.route({
        path: apiBasePath + path,
        method: method.toUpperCase(),
        handler: requestHandler(handler),
        config: { pre: [ licensePreRouting ] }
      });
    };
    return router;
  }, {}));
};
