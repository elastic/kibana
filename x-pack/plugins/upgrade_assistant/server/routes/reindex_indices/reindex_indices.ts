/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import {
  ElasticsearchServiceStart,
  kibanaResponseFactory,
  Logger,
  SavedObjectsClient,
} from '../../../../../../src/core/server';

import { LicensingPluginSetup } from '../../../../licensing/server';

import { ReindexStatus } from '../../../common/types';

import { versionCheckHandlerWrapper } from '../../lib/es_version_precheck';
import { reindexServiceFactory, ReindexWorker } from '../../lib/reindexing';
import { CredentialStore } from '../../lib/reindexing/credential_store';
import { reindexActionsFactory } from '../../lib/reindexing/reindex_actions';
import { sortAndOrderReindexOperations } from '../../lib/reindexing/op_utils';
import { ReindexError } from '../../lib/reindexing/error';
import { RouteDependencies } from '../../types';
import {
  AccessForbidden,
  CannotCreateIndex,
  IndexNotFound,
  MultipleReindexJobsFound,
  ReindexAlreadyInProgress,
  ReindexCannotBeCancelled,
  ReindexTaskCannotBeDeleted,
  ReindexTaskFailed,
} from '../../lib/reindexing/error_symbols';

import { reindexHandler } from './reindex_handler';
import { GetBatchQueueResponse, PostBatchResponse } from './types';

interface CreateReindexWorker {
  logger: Logger;
  elasticsearchService: ElasticsearchServiceStart;
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
  const esClient = elasticsearchService.legacy.client;
  return new ReindexWorker(savedObjects, credentialStore, esClient, logger, licensing);
}

const mapAnyErrorToKibanaHttpResponse = (e: any) => {
  if (e instanceof ReindexError) {
    switch (e.symbol) {
      case AccessForbidden:
        return kibanaResponseFactory.forbidden({ body: e.message });
      case IndexNotFound:
        return kibanaResponseFactory.notFound({ body: e.message });
      case CannotCreateIndex:
      case ReindexTaskCannotBeDeleted:
        return kibanaResponseFactory.internalError({ body: e.message });
      case ReindexTaskFailed:
        // Bad data
        return kibanaResponseFactory.customError({ body: e.message, statusCode: 422 });
      case ReindexAlreadyInProgress:
      case MultipleReindexJobsFound:
      case ReindexCannotBeCancelled:
        return kibanaResponseFactory.badRequest({ body: e.message });
      default:
      // nothing matched
    }
  }
  return kibanaResponseFactory.internalError({ body: e });
};

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
            savedObjects: { client: savedObjectsClient },
            elasticsearch: {
              legacy: { client: esClient },
            },
          },
        },
        request,
        response
      ) => {
        const { indexName } = request.params;
        try {
          const result = await reindexHandler({
            savedObjects: savedObjectsClient,
            dataClient: esClient,
            indexName,
            log,
            licensing,
            headers: request.headers,
            credentialStore,
          });

          // Kick the worker on this node to immediately pickup the new reindex operation.
          getWorker().forceRefresh();

          return response.ok({
            body: result,
          });
        } catch (e) {
          return mapAnyErrorToKibanaHttpResponse(e);
        }
      }
    )
  );

  // Get the current batch queue
  router.get(
    {
      path: `${BASE_PATH}/batch/queue`,
      validate: {},
    },
    async (
      {
        core: {
          elasticsearch: {
            legacy: { client: esClient },
          },
          savedObjects,
        },
      },
      request,
      response
    ) => {
      const { client } = savedObjects;
      const callAsCurrentUser = esClient.callAsCurrentUser.bind(esClient);
      const reindexActions = reindexActionsFactory(client, callAsCurrentUser);
      try {
        const inProgressOps = await reindexActions.findAllByStatus(ReindexStatus.inProgress);
        const { queue } = sortAndOrderReindexOperations(inProgressOps);
        const result: GetBatchQueueResponse = {
          queue: queue.map((savedObject) => savedObject.attributes),
        };
        return response.ok({
          body: result,
        });
      } catch (e) {
        return mapAnyErrorToKibanaHttpResponse(e);
      }
    }
  );

  // Add indices for reindexing to the worker's batch
  router.post(
    {
      path: `${BASE_PATH}/batch`,
      validate: {
        body: schema.object({
          indexNames: schema.arrayOf(schema.string()),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects: { client: savedObjectsClient },
            elasticsearch: {
              legacy: { client: esClient },
            },
          },
        },
        request,
        response
      ) => {
        const { indexNames } = request.body;
        const results: PostBatchResponse = {
          enqueued: [],
          errors: [],
        };
        for (const indexName of indexNames) {
          try {
            const result = await reindexHandler({
              savedObjects: savedObjectsClient,
              dataClient: esClient,
              indexName,
              log,
              licensing,
              headers: request.headers,
              credentialStore,
              reindexOptions: {
                enqueue: true,
              },
            });
            results.enqueued.push(result);
          } catch (e) {
            results.errors.push({
              indexName,
              message: e.message,
            });
          }
        }

        if (results.errors.length < indexNames.length) {
          // Kick the worker on this node to immediately pickup the batch.
          getWorker().forceRefresh();
        }

        return response.ok({ body: results });
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
            elasticsearch: {
              legacy: { client: esClient },
            },
          },
        },
        request,
        response
      ) => {
        const { client } = savedObjects;
        const { indexName } = request.params;
        const callAsCurrentUser = esClient.callAsCurrentUser.bind(esClient);
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
          return mapAnyErrorToKibanaHttpResponse(e);
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
            elasticsearch: {
              legacy: { client: esClient },
            },
          },
        },
        request,
        response
      ) => {
        const { indexName } = request.params;
        const { client } = savedObjects;
        const callAsCurrentUser = esClient.callAsCurrentUser.bind(esClient);
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
          return mapAnyErrorToKibanaHttpResponse(e);
        }
      }
    )
  );
}
