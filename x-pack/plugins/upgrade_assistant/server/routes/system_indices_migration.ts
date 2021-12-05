/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';
import {
  getESSystemIndicesMigrationStatus,
  startESSystemIndicesMigration,
} from '../lib/es_system_indices_migration';

export function registerSystemIndicesMigrationRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  // GET status of the system indices migration
  router.get(
    { path: `${API_BASE_PATH}/system_indices_migration`, validate: false },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const status = await getESSystemIndicesMigrationStatus(client.asCurrentUser);

          return response.ok({
            body: {
              ...status,
              features: status.features.filter(
                (feature) => feature.migration_status !== 'NO_MIGRATION_NEEDED'
              ),
            },
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );

  // POST starts the system indices migration
  router.post(
    { path: `${API_BASE_PATH}/system_indices_migration`, validate: false },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const status = await startESSystemIndicesMigration(client.asCurrentUser);

          return response.ok({
            body: status,
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );
}
