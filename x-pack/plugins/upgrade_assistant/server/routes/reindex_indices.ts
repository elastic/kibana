/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';

import { reindexServiceFactory, ReindexStep } from '../lib/reindex_indices';

export function registerReindexIndicesRoutes(server: Server) {
  const BASE_PATH = '/api/upgrade_assistant/reindex';
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  // Start reindex for an index
  server.route({
    path: `${BASE_PATH}/{indexName}`,
    method: 'POST',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const reindexService = reindexServiceFactory(client, callWithRequest, request);

      try {
        // Create the reindex operation
        let reindexOp = await reindexService.createReindexOperation(indexName);

        // Keep processing until the reindex has started.
        while (reindexOp.attributes.lastCompletedStep < ReindexStep.reindexStarted) {
          reindexOp = await reindexService.processNextStep(reindexOp);
        }

        return reindexOp.attributes;
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
    path: `${BASE_PATH}/{indexName}`,
    method: 'GET',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const reindexService = reindexServiceFactory(client, callWithRequest, request);

      let reindexOp = await reindexService.findReindexOperation(indexName);

      // If the reindex has not been completed yet, poll ES for status and attempt to move to next state.
      // TODO: ignore version conflicts
      try {
        if (reindexOp.attributes.lastCompletedStep === ReindexStep.reindexStarted) {
          reindexOp = await reindexService.processNextStep(reindexOp);
        }
      } catch {
        // noop
      }

      return reindexOp.attributes;
    },
  });

  // Complete the process after reindex is done.
  server.route({
    path: `${BASE_PATH}/{indexName}`,
    method: 'PUT',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const reindexService = reindexServiceFactory(client, callWithRequest, request);

      try {
        let reindexOp = await reindexService.findReindexOperation(indexName);

        if (reindexOp.attributes.lastCompletedStep < ReindexStep.reindexCompleted) {
          return Boom.badRequest(`Index has not finished reindexing yet.`);
        }

        // Finish the rest of the process.
        while (reindexOp.attributes.lastCompletedStep < ReindexStep.aliasCreated) {
          reindexOp = await reindexService.processNextStep(reindexOp);
        }

        return reindexOp.attributes;
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
