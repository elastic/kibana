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
        return await getUpgradeCheckupStatus(callWithRequest, request, basePath);
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

  // TODO: add this back once it has been implemented in ES?
  // server.route({
  //   path: '/api/upgrade_checkup/index_upgrade/{indexName}',
  //   method: 'POST',
  //   options: {
  //     validate: {
  //       params: {
  //         // TODO: make this more specific
  //         indexName: Joi.string().required(),
  //       },
  //     },
  //   },
  //   async handler(request) {
  //     try {
  //       const index = request.params.indexName;
  //       const response = await callWithRequest(request, 'transport.request', {
  //         path: `/_xpack/migration/upgrade/${index}`,
  //         method: 'POST',
  //         query: {
  //           wait_for_completion: false,
  //         },
  //       });

  //       return response;
  //     } catch (e) {
  //       return Boom.boomify(e);
  //     }
  //   },
  // });
}
