/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';

import { reindexServiceFactory, ReindexStatus } from '../lib/reindex_indices';

export function registerReindexIndicesRoutes(server: Server) {
  const BASE_PATH = '/api/upgrade_assistant/reindex';
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  // Start reindex for an index
  server.route({
    path: `${BASE_PATH}/{indexName}/start`,
    method: 'GET',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const reindexService = reindexServiceFactory(client, callWithRequest, request);

      try {
        // Create the reindex operation
        let reindexOp = await reindexService.createReindexOperation(indexName);

        // Keep processing until the reindex has started.
        while (reindexOp.attributes.status < ReindexStatus.reindexStarted) {
          reindexOp = await reindexService.processNextStep(reindexOp);
        }

        return { status: reindexOp.attributes.status };
      } catch (e) {
        if (!e.isBoom) {
          return Boom.boomify(e, { statusCode: 500 });
        }

        return e;
      }
    },
  });

  // Get status
  server.route({
    path: `${BASE_PATH}/{indexName}/status`,
    method: 'GET',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const reindexService = reindexServiceFactory(client, callWithRequest, request);

      try {
        let reindexOp = await reindexService.findReindexOperation(indexName);
        // First run an update to check if the reindexing is still in progress.
        reindexOp = await reindexService.processNextStep(reindexOp);

        // If its completed, finish the rest of the process.
        if (reindexOp.attributes.status === ReindexStatus.reindexCompleted) {
          while (reindexOp.attributes.status < ReindexStatus.completed) {
            reindexOp = await reindexService.processNextStep(reindexOp);
          }
        }

        return { status: reindexOp.attributes.status };
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });

  // Cancel reindex
  server.route({
    path: `${BASE_PATH}/{indexName}`,
    method: 'DELETE',
    async handler(request) {
      return Boom.notImplemented();
    },
  });
}
