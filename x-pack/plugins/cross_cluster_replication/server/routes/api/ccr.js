/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { deserializeAutoFollowStats } from '../../lib/ccr_stats_serialization';
import { deserializeListFollowerIndices } from '../../lib/follower_index_serialization';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';

export const registerCcrRoutes = (server) => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  const getStatsHandler = async (request) => {
    const callWithRequest = callWithRequestFactory(server, request);

    try {
      const response = await callWithRequest('ccr.stats');
      return {
        autoFollow: deserializeAutoFollowStats(response.auto_follow_stats),
        follow: {
          indices: deserializeListFollowerIndices(response.follow_stats.indices)
        }
      };
    } catch(err) {
      if (isEsError(err)) {
        throw wrapEsError(err);
      }
      throw wrapUnknownError(err);
    }
  };

  /**
   * Returns CCR stats
   */
  server.route({
    path: `${API_BASE_PATH}/stats`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: getStatsHandler,
  });

  /**
   * Returns Auto-follow stats
   */
  server.route({
    path: `${API_BASE_PATH}/stats/auto-follow`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const { autoFollow } = await getStatsHandler(request);
      return autoFollow;
    },
  });
};
