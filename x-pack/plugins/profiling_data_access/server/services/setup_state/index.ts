/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  validateMaximumBuckets,
  validateResourceManagement,
} from '../../../common/cluster_settings';
import {
  validateCollectorPackagePolicy,
  validateProfilingInApmPackagePolicy,
  validateSymbolizerPackagePolicy,
} from '../../../common/fleet_policies';
import { hasProfilingData } from '../../../common/has_profiling_data';
import { validateSecurityRole } from '../../../common/security_role';
import {
  ProfilingCloudSetupOptions,
  createDefaultCloudSetupState,
} from '../../../common/cloud_setup';
import { RegisterServicesParams } from '../register_services';
import { mergePartialSetupStates } from '../../../common/setup';

export interface CloudSetupStateParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  spaceId?: string;
}

export async function getCloudSetupState({
  createProfilingEsClient,
  deps,
  esClient,
  logger,
  soClient,
  spaceId,
}: RegisterServicesParams & CloudSetupStateParams) {
  const isCloudEnabled = deps.cloud?.isCloudEnabled;
  if (!isCloudEnabled || !deps.fleet) {
    throw new Error('BOOMMMMMMMMMM');
  }
  const clientWithDefaultAuth = createProfilingEsClient({
    esClient,
    useDefaultAuth: true,
  });
  const clientWithProfilingAuth = createProfilingEsClient({
    esClient,
    useDefaultAuth: false,
  });

  const setupOptions: ProfilingCloudSetupOptions = {
    client: clientWithDefaultAuth,
    logger,
    soClient,
    spaceId: spaceId ?? DEFAULT_SPACE_ID,
    packagePolicyClient: deps.fleet.packagePolicyService,
    isCloudEnabled,
  };

  const state = createDefaultCloudSetupState();
  state.cloud.available = isCloudEnabled;

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

  return mergePartialSetupStates(state, partialStates);
}

export function createGetCloudSetupState(params: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: CloudSetupStateParams) =>
    getCloudSetupState({ ...params, esClient, soClient, spaceId });
}
