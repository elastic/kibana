/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ReindexStatus } from '../../common/types';
import { EsVersionPrecheck } from '../lib/es_version_precheck';
import { reindexServiceFactory, ReindexWorker } from '../lib/reindexing';
import { CredentialStore } from '../lib/reindexing/credential_store';
import { reindexActionsFactory } from '../lib/reindexing/reindex_actions';

export function registerReindexWorker(server: Server, credentialStore: CredentialStore) {
  const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const xpackInfo = server.plugins.xpack_main.info;
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

  const worker = new ReindexWorker(
    savedObjectsClient,
    credentialStore,
    callWithRequest,
    callWithInternalUser,
    xpackInfo,
    log
  );

  // Wait for ES connection before starting the polling loop.
  server.plugins.elasticsearch.waitUntilReady().then(() => {
    worker.start();
    server.events.on('stop', () => worker.stop());
  });

  return worker;
}

export function registerReindexIndicesRoutes(
  server: Server,
  worker: ReindexWorker,
  credentialStore: CredentialStore
) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const xpackInfo = server.plugins.xpack_main.info;
  const BASE_PATH = '/api/upgrade_assistant/reindex';

  // Start reindex for an index
  server.route({
    path: `${BASE_PATH}/{indexName}`,
    method: 'POST',
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const callCluster = callWithRequest.bind(null, request) as CallCluster;
      const reindexActions = reindexActionsFactory(client, callCluster);
      const reindexService = reindexServiceFactory(
        callCluster,
        xpackInfo,
        reindexActions,
        server.log
      );

      try {
        if (!(await reindexService.hasRequiredPrivileges(indexName))) {
          throw Boom.forbidden(`You do not have adequate privileges to reindex this index.`);
        }

        const existingOp = await reindexService.findReindexOperation(indexName);

        // If the reindexOp already exists and it's paused, resume it. Otherwise create a new one.
        const reindexOp =
          existingOp && existingOp.attributes.status === ReindexStatus.paused
            ? await reindexService.resumeReindexOperation(indexName)
            : await reindexService.createReindexOperation(indexName);

        // Add users credentials for the worker to use
        credentialStore.set(reindexOp, request.headers);

        // Kick the worker on this node to immediately pickup the new reindex operation.
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
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const callCluster = callWithRequest.bind(null, request) as CallCluster;
      const reindexActions = reindexActionsFactory(client, callCluster);
      const reindexService = reindexServiceFactory(
        callCluster,
        xpackInfo,
        reindexActions,
        server.log
      );

      try {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(indexName);
        const reindexOp = await reindexService.findReindexOperation(indexName);
        // If the user doesn't have privileges than querying for warnings is going to fail.
        const warnings = hasRequiredPrivileges
          ? await reindexService.detectReindexWarnings(indexName)
          : [];
        const indexGroup = reindexService.getIndexGroup(indexName);

        return {
          reindexOp: reindexOp ? reindexOp.attributes : null,
          warnings,
          indexGroup,
          hasRequiredPrivileges,
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
    path: `${BASE_PATH}/{indexName}/cancel`,
    method: 'POST',
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      const client = request.getSavedObjectsClient();
      const { indexName } = request.params;
      const callCluster = callWithRequest.bind(null, request) as CallCluster;
      const reindexActions = reindexActionsFactory(client, callCluster);
      const reindexService = reindexServiceFactory(
        callCluster,
        xpackInfo,
        reindexActions,
        server.log
      );

      try {
        await reindexService.cancelReindexing(indexName);

        return { acknowledged: true };
      } catch (e) {
        if (!e.isBoom) {
          return Boom.boomify(e, { statusCode: 500 });
        }

        return e;
      }
    },
  });
}
