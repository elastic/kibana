/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import {
  deserializeAutoFollowPattern,
  deserializeListAutoFollowPatterns,
  serializeAutoFollowPattern
} from '../../lib/auto_follow_pattern_serialization';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';

// import { esErrors } from '../../../fixtures'; // Temp for development to test ES error in UI

export const registerAutoFollowPatternRoutes = (server) => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all Auto follow patterns
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      // throw wrapEsError(esErrors[403]); // Temp for development to test ES error in UI. MUST be commented in CR

      try {
        const response = await callWithRequest('ccr.autoFollowPatterns');
        return deserializeListAutoFollowPatterns(response);
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Returns a list of all Auto follow patterns
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
    method: 'PUT',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const body = serializeAutoFollowPattern(request.payload);

      try {
        return await callWithRequest('ccr.createAutoFollowPattern', { id, body });
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Returns a single Auto follow pattern
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;

      try {
        const response = await callWithRequest('ccr.autoFollowPattern', { id });
        return deserializeAutoFollowPattern(id, response[id]);
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });
};
