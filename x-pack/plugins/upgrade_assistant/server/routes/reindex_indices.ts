/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsClient } from 'src/server/saved_objects';
import { reindexServiceFactory, ReindexWorker } from '../lib/reindexing';
import { reindexActionsFactory } from '../lib/reindexing/reindex_actions';

export function registerReindexWorker(server: Server) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const savedObjectsRepository = server.savedObjects.getSavedObjectsRepository(
    callWithInternalUser
  );
  const savedObjectsClient = new server.savedObjects.SavedObjectsClient(
    savedObjectsRepository
  ) as SavedObjectsClient;

  // Cannot pass server.log directly because it's value changes during startup (?).
  // Use this function to proxy through.
  const log: Server['log'] = (
    tags: string | string[],
    data?: string | object | (() => any),
    timestamp?: number
  ) => server.log(tags, data, timestamp);

  const worker = new ReindexWorker(savedObjectsClient, callWithInternalUser, log);

  // Wait for ES connection before starting the polling loop.
  server.plugins.elasticsearch.waitUntilReady().then(() => {
    worker.start();
    server.events.on('stop', () => worker.stop());
  });

  return worker;
}

export function registerReindexIndicesRoutes(server: Server, worker: ReindexWorker) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const BASE_PATH = '/api/upgrade_assistant/reindex';

  // Start reindex for an index
  server.route({
    path: `${BASE_PATH}/{indexName}`,
    method: 'POST',
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const callCluster = callWithRequest.bind(null, request) as CallCluster;
      const reindexActions = reindexActionsFactory(client, callCluster);
      const reindexService = reindexServiceFactory(callCluster, reindexActions);

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
      const reindexActions = reindexActionsFactory(client, callCluster);
      const reindexService = reindexServiceFactory(callCluster, reindexActions);

      try {
        const reindexOp = await reindexService.findReindexOperation(indexName);
        const reindexWarnings = await reindexService.detectReindexWarnings(indexName);

        return {
          warnings: reindexWarnings,
          reindexOp: reindexOp ? reindexOp.attributes : null,
        };
      } catch (e) {
        if (!e.isBoom) {
          return Boom.boomify(e, { statusCode: 500 });
        }

        return e;
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
