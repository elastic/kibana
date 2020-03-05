/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger, ElasticsearchServiceSetup, SavedObjectsClient } from 'src/core/server';
import { ReindexStatus } from '../../common/types';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { reindexServiceFactory, ReindexWorker } from '../lib/reindexing';
import { CredentialStore } from '../lib/reindexing/credential_store';
import { reindexActionsFactory } from '../lib/reindexing/reindex_actions';
import { RouteDependencies } from '../types';
import { LicensingPluginSetup } from '../../../licensing/server';

interface CreateReindexWorker {
  logger: Logger;
  elasticsearchService: ElasticsearchServiceSetup;
  credentialStore: CredentialStore;
  savedObjects: SavedObjectsClient;
  licensing: LicensingPluginSetup;
}

export function createReindexWorker({
  logger,
  elasticsearchService,
  credentialStore,
  savedObjects,
  licensing,
}: CreateReindexWorker) {
  const { adminClient } = elasticsearchService;
  return new ReindexWorker(savedObjects, credentialStore, adminClient, logger, licensing);
}

export function registerReindexIndicesRoutes(
  { credentialStore, router, licensing, log }: RouteDependencies,
  getWorker: () => ReindexWorker
) {
  const BASE_PATH = '/api/upgrade_assistant/reindex';

  // Start reindex for an index
  router.post(
    {
      path: `${BASE_PATH}/{indexName}`,
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects,
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        const { indexName } = request.params as any;
        const { client } = savedObjects;
        const callAsCurrentUser = dataClient.callAsCurrentUser.bind(dataClient);
        const reindexActions = reindexActionsFactory(client, callAsCurrentUser);
        const reindexService = reindexServiceFactory(
          callAsCurrentUser,
          reindexActions,
          log,
          licensing
        );

        try {
          if (!(await reindexService.hasRequiredPrivileges(indexName))) {
            return response.forbidden({
              body: `You do not have adequate privileges to reindex this index.`,
            });
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
          getWorker().forceRefresh();

          return response.ok({ body: reindexOp.attributes });
        } catch (e) {
          return response.internalError({ body: e });
        }
      }
    )
  );

  // Get status
  router.get(
    {
      path: `${BASE_PATH}/{indexName}`,
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects,
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        const { client } = savedObjects;
        const { indexName } = request.params as any;
        const callAsCurrentUser = dataClient.callAsCurrentUser.bind(dataClient);
        const reindexActions = reindexActionsFactory(client, callAsCurrentUser);
        const reindexService = reindexServiceFactory(
          callAsCurrentUser,
          reindexActions,
          log,
          licensing
        );

        try {
          const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(indexName);
          const reindexOp = await reindexService.findReindexOperation(indexName);
          // If the user doesn't have privileges than querying for warnings is going to fail.
          const warnings = hasRequiredPrivileges
            ? await reindexService.detectReindexWarnings(indexName)
            : [];
          const indexGroup = reindexService.getIndexGroup(indexName);

          return response.ok({
            body: {
              reindexOp: reindexOp ? reindexOp.attributes : null,
              warnings,
              indexGroup,
              hasRequiredPrivileges,
            },
          });
        } catch (e) {
          if (!e.isBoom) {
            return response.internalError({ body: e });
          }
          return response.customError({
            body: {
              message: e.message,
            },
            statusCode: e.statusCode,
          });
        }
      }
    )
  );

  // Cancel reindex
  router.post(
    {
      path: `${BASE_PATH}/{indexName}/cancel`,
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects,
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        const { indexName } = request.params as any;
        const { client } = savedObjects;
        const callAsCurrentUser = dataClient.callAsCurrentUser.bind(dataClient);
        const reindexActions = reindexActionsFactory(client, callAsCurrentUser);
        const reindexService = reindexServiceFactory(
          callAsCurrentUser,
          reindexActions,
          log,
          licensing
        );

        try {
          await reindexService.cancelReindexing(indexName);

          return response.ok({ body: { acknowledged: true } });
        } catch (e) {
          if (!e.isBoom) {
            return response.internalError({ body: e });
          }
          return response.customError({
            body: {
              message: e.message,
            },
            statusCode: e.statusCode,
          });
        }
      }
    )
  );
}
