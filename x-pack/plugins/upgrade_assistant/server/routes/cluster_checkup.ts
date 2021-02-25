/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpgradeAssistantStatus } from '../lib/es_migration_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';
import { reindexActionsFactory } from '../lib/reindexing/reindex_actions';
import { reindexServiceFactory } from '../lib/reindexing';

export function registerClusterCheckupRoutes({ cloud, router, licensing, log }: RouteDependencies) {
  const isCloudEnabled = Boolean(cloud?.isCloudEnabled);

  router.get(
    {
      path: '/api/upgrade_assistant/status',
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects: { client: savedObjectsClient },
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const status = await getUpgradeAssistantStatus(client, isCloudEnabled);

          const asCurrentUser = client.asCurrentUser;
          const reindexActions = reindexActionsFactory(savedObjectsClient, asCurrentUser);
          const reindexService = reindexServiceFactory(
            asCurrentUser,
            reindexActions,
            log,
            licensing
          );
          const indexNames = status.indices
            .filter(({ index }) => typeof index !== 'undefined')
            .map(({ index }) => index as string);

          await reindexService.cleanupReindexOperations(indexNames);

          return response.ok({
            body: status,
          });
        } catch (e) {
          if (e.statusCode === 403) {
            return response.forbidden(e.message);
          }

          throw e;
        }
      }
    )
  );
}
