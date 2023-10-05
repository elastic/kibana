/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ProfilingStatus } from '@kbn/profiling-utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getSetupState } from '../get_setup_state';
import { RegisterServicesParams } from '../register_services';
import { ProfilingSetupOptions, areResourcesSetup } from '../../../common/setup';

export interface HasSetupParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  spaceId?: string;
}

export function createGetStatusService({
  createProfilingEsClient,
  deps,
  logger,
}: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: HasSetupParams): Promise<ProfilingStatus> => {
    try {
      const isCloudEnabled = deps.cloud.isCloudEnabled;
      if (!isCloudEnabled) {
        // When not on cloud just return that is has not set up and has no data
        return {
          has_setup: false,
          has_data: false,
          pre_8_9_1_data: false,
        };
      }

      const clientWithDefaultAuth = createProfilingEsClient({
        esClient,
        useDefaultAuth: true,
      });
      const clientWithProfilingAuth = createProfilingEsClient({
        esClient,
        useDefaultAuth: false,
      });

      const setupOptions: ProfilingSetupOptions = {
        client: clientWithDefaultAuth,
        logger,
        packagePolicyClient: deps.fleet.packagePolicyService,
        soClient,
        spaceId: spaceId ?? DEFAULT_SPACE_ID,
        isCloudEnabled,
      };

      const setupState = await getSetupState(setupOptions, clientWithProfilingAuth);

      return {
        has_setup: areResourcesSetup(setupState),
        has_data: setupState.data.available,
        pre_8_9_1_data: setupState.resources.pre_8_9_1_data,
      };
    } catch (error) {
      // We cannot fully check the status of all resources
      // to make sure Profiling has been set up and has data
      // for users with monitor privileges. This privileges
      // is needed to call the profiling ES plugin for example.
      if (error?.meta?.statusCode === 403 || error?.originalError?.meta?.statusCode === 403) {
        return {
          has_setup: true,
          pre_8_9_1_data: false,
          has_data: true,
          unauthorized: true,
        };
      }

      throw error;
    }
  };
}
