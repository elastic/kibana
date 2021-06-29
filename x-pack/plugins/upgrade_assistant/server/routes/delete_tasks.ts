/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@commercial/boom';
import { Server } from '@commercial/hapi';

export function registerDeleteTasksRoutes(server: Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_assistant/delete_tasks_index',
    method: 'POST',
    async handler(request) {
      try {
        const { acknowledged } = await callWithRequest(request, 'indices.delete', {
          index: '.tasks',
        });

        if (!acknowledged) {
          throw new Error('Could not delete .tasks index');
        }

        return { success: true };
      } catch (e) {
        if (!e.isBoom) {
          return Boom.boomify(e, { statusCode: 500 });
        }

        return e;
      }
    },
  });
}
