/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsClient } from 'src/server/saved_objects';
import { reindexServiceFactory, ReindexStep } from '../lib/reindex_service';
import { ReindexWorker } from '../lib/reindex_worker';

export function registerReindexIndicesRoutes(server: Server) {
  const BASE_PATH = '/api/upgrade_assistant/reindex';
  const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const savedObjectsRepository = server.savedObjects.getSavedObjectsRepository(
    callWithInternalUser
  );
  const savedObjectsClient = new server.savedObjects.SavedObjectsClient(
    savedObjectsRepository
  ) as SavedObjectsClient;
  const worker = new ReindexWorker(savedObjectsClient, callWithInternalUser, server.log);

  // server.events.on('start', () => worker.start());
  worker.start();
  server.events.on('stop', () => worker.stop());

  // Start reindex for an index
  server.route({
    path: `${BASE_PATH}/{indexName}`,
    method: 'POST',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const callCluster = callWithRequest.bind(null, request) as CallCluster;
      const reindexService = reindexServiceFactory(client, callCluster);

      try {
        // Create the reindex operation
        const reindexOp = await reindexService.createReindexOperation(indexName);
        worker.forceRefresh();

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
      const callCluster = callWithRequest.bind(null, request) as CallCluster;
      const reindexService = reindexServiceFactory(client, callCluster);

      const reindexOp = await reindexService.findReindexOperation(indexName);
      return reindexOp.attributes;
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
