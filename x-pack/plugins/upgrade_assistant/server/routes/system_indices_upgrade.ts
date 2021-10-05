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

const mockedResponse = {
  features: [
    {
      feature_name: 'log_stash',
      minimum_index_version: '7.1.1',
      upgrade_status: 'NO_UPGRADE_NEEDED',
      indices: [
        {
          index: '.security-7',
          index_version: '7.1.1',
        },
      ],
    },
    {
      feature_name: 'security',
      minimum_index_version: '7.1.1',
      upgrade_status: 'ERROR',
      indices: [
        {
          index: '.security-7',
          index_version: '7.1.1',
        },
      ],
    },
    {
      feature_name: 'kibana',
      minimum_index_version: '7.1.1',
      upgrade_status: 'IN_PROGRESS',
      indices: [
        {
          index: '.security-7',
          index_version: '7.1.1',
        },
      ],
    },
    {
      feature_name: 'machine_learning',
      minimum_index_version: '7.1.1',
      upgrade_status: 'UPGRADE_NEEDED',
      indices: [
        {
          index: '.security-7',
          index_version: '7.1.1',
        },
      ],
    },
  ],
  // upgrade_status: 'NO_UPGRADE_NEEDED',
  upgrade_status: 'UPGRADE_NEEDED',
  // upgrade_status: 'IN_PROGRESS',
};

export function registerSystemIndicesUpgradeRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
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
            body: mockedResponse,
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );

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
