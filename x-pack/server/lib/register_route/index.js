/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from './call_with_request_factory';
import { isEsErrorFactory } from './is_es_error_factory';
import { wrapEsError, wrapUnknownError } from './error_wrappers';
import { licensePreRoutingFactory } from'./license_pre_routing_factory';

export function registerRoute({ server, handler, pluginId, path, method }) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server, pluginId);

  server.route({
    path,
    method,
    handler: async (request, h) => {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        return handler(request, callWithRequest, h);
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }

        throw wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
