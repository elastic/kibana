/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Logger, ElasticsearchServiceSetup, SavedObjectsClient } from 'kibana/server';

import { LicensingPluginSetup } from '../../../../licensing/server';

import { ReindexOperation } from '../../../common/types';

import { versionCheckHandlerWrapper } from '../../lib/es_version_precheck';
import { reindexServiceFactory, ReindexWorker } from '../../lib/reindexing';
import { CredentialStore } from '../../lib/reindexing/credential_store';
import { reindexActionsFactory } from '../../lib/reindexing/reindex_actions';
import { RouteDependencies } from '../../types';

import { reindexHandler, SYMBOL_FORBIDDEN } from './reindex_handler';

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
            savedObjects: { client: savedObjectsClient },
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        const { indexName } = request.params;
        try {
          return response.ok({
            body: await reindexHandler({
              savedObjects: savedObjectsClient,
              dataClient,
              indexName,
              log,
              licensing,
              headers: request.headers,
              credentialStore,
              getWorker,
            }),
          });
        } catch (e) {
          if (e === SYMBOL_FORBIDDEN) {
            return response.forbidden({
              body: i18n.translate('xpack.upgradeAssistant.reindex.reindexPrivilegesErrorSingle', {
                defaultMessage: `You do not have adequate privileges to reindex this index.`,
              }),
            });
          }
          return response.internalError(e);
        }
      }
    )
  );

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
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        const { indexNames } = request.body;
        const results = {
          successes: [] as ReindexOperation[],
          errors: [] as Array<{ indexName: string; message: string }>,
        };
        for (const indexName of indexNames) {
          try {
            const result = await reindexHandler({
              savedObjects: savedObjectsClient,
              dataClient,
              indexName,
              log,
              licensing,
              headers: request.headers,
              credentialStore,
              getWorker,
            });
            results.successes.push(result);
          } catch (e) {
            if (e === SYMBOL_FORBIDDEN) {
              results.errors.push({
                message: i18n.translate(
                  'xpack.upgradeAssistant.reindex.reindexPrivilegesErrorBatch',
                  {
                    defaultMessage: `You do not have adequate privileges to reindex "${indexName}".`,
                  }
                ),
                indexName,
              });
            } else {
              results.errors.push({
                indexName,
                message: e.message,
              });
            }
          }
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
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        const { client } = savedObjects;
        const { indexName } = request.params;
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
        const { indexName } = request.params;
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
