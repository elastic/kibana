/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'src/server/kbn_server';

import { getUpgradeCheckupStatus } from '../lib/es_migration_apis';

export function registerClusterCheckupRoutes(server: Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const basePath = server.config().get('server.basePath');

  server.route({
    path: '/api/upgrade_checkup/status',
    method: 'GET',
    async handler(request) {
      try {
        return await getUpgradeCheckupStatus(callWithRequest, request, basePath, true);
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
