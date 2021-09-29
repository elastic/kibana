/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { API_BASE_PATH } from '../../../common/constants';
import {
  ElasticsearchServiceStart,
  kibanaResponseFactory,
  Logger,
  SavedObjectsClient,
} from '../../../../../../src/core/server';

import { LicensingPluginSetup } from '../../../../licensing/server';
import { SecurityPluginStart } from '../../../../security/server';

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
  security: SecurityPluginStart;
}

export function createReindexWorker({
  logger,
  elasticsearchService,
  credentialStore,
  savedObjects,
  licensing,
  security,
}: CreateReindexWorker) {
  const esClient = elasticsearchService.client;
  return new ReindexWorker(savedObjects, credentialStore, esClient, logger, licensing, security);
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
        throw e;
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

  throw e;
};

export function registerReindexIndicesRoutes(
  {
    credentialStore,
    router,
    licensing,
    log,
    getSecurityPlugin,
    lib: { handleEsError },
  }: RouteDependencies,
  getWorker: () => ReindexWorker
) {
  const BASE_PATH = `${API_BASE_PATH}/reindex`;

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
            elasticsearch: { client: esClient },
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
            request,
            credentialStore,
            security: getSecurityPlugin(),
          });

          // Kick the worker on this node to immediately pickup the new reindex operation.
          getWorker().forceRefresh();

          return response.ok({
            body: result,
          });
        } catch (error) {
          if (error instanceof ResponseError) {
            return handleEsError({ error, response });
          }
          return mapAnyErrorToKibanaHttpResponse(error);
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
          elasticsearch: { client: esClient },
          savedObjects,
        },
      },
      request,
      response
    ) => {
      const { client } = savedObjects;
      const callAsCurrentUser = esClient.asCurrentUser;
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
      } catch (error) {
        if (error instanceof ResponseError) {
          return handleEsError({ error, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
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
            elasticsearch: { client: esClient },
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
              request,
              credentialStore,
              reindexOptions: {
                enqueue: true,
              },
              security: getSecurityPlugin(),
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
            elasticsearch: { client: esClient },
          },
        },
        request,
        response
      ) => {
        const { client } = savedObjects;
        const { indexName } = request.params;
        const asCurrentUser = esClient.asCurrentUser;
        const reindexActions = reindexActionsFactory(client, asCurrentUser);
        const reindexService = reindexServiceFactory(asCurrentUser, reindexActions, log, licensing);

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
        } catch (error) {
          if (error instanceof ResponseError) {
            return handleEsError({ error, response });
          }
          return mapAnyErrorToKibanaHttpResponse(error);
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
            elasticsearch: { client: esClient },
          },
        },
        request,
        response
      ) => {
        const { indexName } = request.params;
        const { client } = savedObjects;
        const callAsCurrentUser = esClient.asCurrentUser;
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
        } catch (error) {
          if (error instanceof ResponseError) {
            return handleEsError({ error, response });
          }

          return mapAnyErrorToKibanaHttpResponse(error);
        }
      }
    )
  );
}
