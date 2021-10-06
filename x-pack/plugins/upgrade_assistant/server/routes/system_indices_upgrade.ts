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
  getESSystemIndicesUpgradeStatus,
  startESSystemIndicesUpgrade,
} from '../lib/es_system_indices_upgrade';

export function registerSystemIndicesUpgradeRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  // GET status of the system indices upgrade
  router.get(
    { path: `${API_BASE_PATH}/system_indices_upgrade`, validate: false },
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
          const status = await getESSystemIndicesUpgradeStatus(client.asCurrentUser);

          return response.ok({
            body: status,
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );

  // POST starts the system indices upgrade
  router.post(
    { path: `${API_BASE_PATH}/system_indices_upgrade`, validate: false },
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
          const status = await startESSystemIndicesUpgrade(client.asCurrentUser);

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
