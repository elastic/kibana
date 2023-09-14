/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { ProfilingStatusCheck } from '@kbn/profiling-utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';
import { RegisterServicesParams } from '../register_services';
import { validateMaximumBuckets, validateResourceManagement } from './cluster_settings';
import {
  validateCollectorPackagePolicy,
  validateProfilingInApmPackagePolicy,
  validateSymbolizerPackagePolicy,
} from './fleet_policies';
import { hasProfilingData } from './has_profiling_data';
import { validateSecurityRole } from './security_role';
import { areResourcesSetup, createDefaultSetupState, mergePartialSetupStates } from './setup';

interface HasSetupParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  spaceId?: string;
}

export interface ProfilingSetupOptions {
  client: ProfilingESClient;
  soClient: SavedObjectsClientContract;
  packagePolicyClient: PackagePolicyClient;
  logger: Logger;
  spaceId: string;
  isCloudEnabled: boolean;
}

export function createGetStatusService({
  createProfilingEsClient,
  deps,
  logger,
}: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: HasSetupParams): Promise<ProfilingStatusCheck> => {
    try {
      const clientWithDefaultAuth = createProfilingEsClient({
        esClient,
        useDefaultAuth: true,
      });
      const clientWithProfilingAuth = createProfilingEsClient({
        esClient,
        useDefaultAuth: false,
      });

      const isCloudEnabled = deps.cloud.isCloudEnabled;

      const setupOptions: ProfilingSetupOptions = {
        client: clientWithDefaultAuth,
        logger,
        packagePolicyClient: deps.fleet.packagePolicyService,
        soClient,
        spaceId: spaceId ?? DEFAULT_SPACE_ID,
        isCloudEnabled,
      };

      const state = createDefaultSetupState();
      state.cloud.available = isCloudEnabled;

      if (!state.cloud.available) {
        // When not on cloud just return that is has not set up and has no data
        return {
          has_setup: false,
          has_data: false,
          pre_8_9_1_data: false,
        };
      }

      const verifyFunctions = [
        validateMaximumBuckets,
        validateResourceManagement,
        validateSecurityRole,
        validateCollectorPackagePolicy,
        validateSymbolizerPackagePolicy,
        validateProfilingInApmPackagePolicy,
      ];

      const partialStates = await Promise.all([
        ...verifyFunctions.map((fn) => fn(setupOptions)),
        hasProfilingData({
          ...setupOptions,
          client: clientWithProfilingAuth,
        }),
      ]);

      const mergedState = mergePartialSetupStates(state, partialStates);

      return {
        has_setup: areResourcesSetup(mergedState),
        has_data: mergedState.data.available,
        pre_8_9_1_data: mergedState.resources.pre_8_9_1_data,
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
