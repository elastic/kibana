/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from 'kibana';

import { getUpgradeAssistantStatus } from '../lib/es_migration_apis';

export function registerClusterCheckupRoutes(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const { isCloudEnabled } = server.plugins.cloud;

  server.route({
    path: '/api/upgrade_assistant/status',
    method: 'GET',
    async handler(request) {
      try {
        const apmIndexPatterns = server.plugins.apm_oss.indexPatterns;

        return await getUpgradeAssistantStatus(
          callWithRequest,
          request,
          isCloudEnabled,
          apmIndexPatterns
        );
      } catch (e) {
        if (e.status === 403) {
          return Boom.forbidden(e.message);
        }

        return Boom.boomify(e, {
          statusCode: 500,
        });
      }
    },
  });
}
