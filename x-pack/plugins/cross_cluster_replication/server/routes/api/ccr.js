/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { deserializeAutoFollowStats } from '../../lib/ccr_stats_serialization';
import { licensePreRoutingFactory } from'../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';

export const registerCcrRoutes = (server) => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns Auto-follow stats
   */
  server.route({
    path: `${API_BASE_PATH}/stats/auto_follow`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const {
          auto_follow_stats: autoFollowStats,
        } = await callWithRequest('ccr.stats');

        return deserializeAutoFollowStats(autoFollowStats);
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Returns whether the user has CCR permissions
   */
  server.route({
    path: `${API_BASE_PATH}/permissions`,
    method: 'GET',
    config: {
      pre: [ licensePreRouting ]
    },
    handler: async (request) => {
      const xpackMainPlugin = server.plugins.xpack_main;
      const xpackInfo = (xpackMainPlugin && xpackMainPlugin.info);

      if (!xpackInfo) {
        // xpackInfo is updated via poll, so it may not be available until polling has begun.
        // In this rare situation, tell the client the service is temporarily unavailable.
        throw new Boom('Security info unavailable', { statusCode: 503 });
      }

      const securityInfo = (xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security'));
      if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
        // If security isn't enabled or available (in the case where security is enabled but license reverted to Basic) let the user use CCR.
        return {
          hasPermission: true,
          missingClusterPrivileges: [],
        };
      }

      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const {
          has_all_requested: hasPermission,
          cluster,
        } = await callWithRequest('ccr.permissions', {
          body: {
            cluster: ['manage', 'manage_ccr'],
          },
        });

        const missingClusterPrivileges = Object.keys(cluster).reduce((permissions, permissionName) => {
          if (!cluster[permissionName]) {
            permissions.push(permissionName);
            return permissions;
          }
        }, []);

        return {
          hasPermission,
          missingClusterPrivileges,
        };
      } catch(err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });
};
