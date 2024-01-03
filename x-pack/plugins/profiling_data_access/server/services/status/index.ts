/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ProfilingStatus } from '@kbn/profiling-utils';
import { areCloudResourcesSetup } from '../../../common/cloud_setup';
import { areResourcesSetup } from '../../../common/setup';
import { RegisterServicesParams } from '../register_services';
import { getSetupState } from '../setup_state';

export interface HasSetupParams {
  soClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  spaceId?: string;
}

export function createGetStatusService(params: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: HasSetupParams): Promise<ProfilingStatus> => {
    try {
      const { type, setupState } = await getSetupState({ ...params, esClient, soClient, spaceId });

      params.logger.debug(`Set up state for: ${type}: ${JSON.stringify(setupState, null, 2)}`);

      return {
        has_setup:
          type === 'cloud' ? areCloudResourcesSetup(setupState) : areResourcesSetup(setupState),
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
