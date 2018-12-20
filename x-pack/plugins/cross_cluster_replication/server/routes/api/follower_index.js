/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import {
  deserializeListFollowerIndices,
  serializeFollowerIndex,
} from '../../lib/follower_index_serialization';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';

export const registerFollowerIndexRoutes = (server) => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all Follower indices
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await callWithRequest('ccr.followerIndices');
        return ({
          indices: deserializeListFollowerIndices(response.follow_stats.indices)
        });
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Create a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices`,
    method: 'POST',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name, ...rest } = request.payload;
      const body = serializeFollowerIndex(rest);

      try {
        return await callWithRequest('ccr.saveFollowerIndex', { name, body });
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });
};
