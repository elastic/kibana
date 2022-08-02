/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';
import { reindexActionsFactory } from '../lib/reindexing/reindex_actions';
import { reindexServiceFactory } from '../lib/reindexing';

export function registerESDeprecationRoutes({
  router,
  lib: { handleEsError },
  licensing,
  log,
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/es_deprecations`,
      validate: false,
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          savedObjects: { client: savedObjectsClient },
          elasticsearch: { client },
        } = await core;
        const status = await getESUpgradeStatus(client);

        const asCurrentUser = client.asCurrentUser;
        const reindexActions = reindexActionsFactory(savedObjectsClient, asCurrentUser);
        const reindexService = reindexServiceFactory(asCurrentUser, reindexActions, log, licensing);
        const indexNames = status.deprecations
          .filter(({ index }) => typeof index !== 'undefined')
          .map(({ index }) => index as string);

        await reindexService.cleanupReindexOperations(indexNames);

        return response.ok({
          body: status,
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
