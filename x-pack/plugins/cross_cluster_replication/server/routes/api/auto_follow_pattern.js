/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';

// import { errors } from '../../mock'; // Temp for development to test ES error in UI

export const registerAutoFollowPatternRoutes = (server) => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all Auto Follow patterns
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      // throw wrapEsError(errors[403]); // Temp for development to test ES error in UI. MUST be commented in CR

      try {
        const response = await callWithRequest('ccr.autoFollowPatterns');
        return response;
      } catch(err) {

        if (isEsError(err)) {
          // Currently Elasticsearch throw a 404 when there are no Auto follow pattern
          // It should instead return an empty object as the resource exists but does not have any result.
          // We temporarly fix it here until the issue is resolved.
          // ES issue: https://github.com/elastic/elasticsearch/issues/35371
          if (err.status === 404) {
            return {};
          }

          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });
};
