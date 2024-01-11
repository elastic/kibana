/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { CloudSetupStateType } from '../../../common/cloud_setup';
import { SetupStateType } from '../../../common/setup';
import { RegisterServicesParams } from '../register_services';
import { cloudSetupState } from './cloud_setup_state';
import { selfManagedSetupState } from './self_managed_setup_state';

export interface SetupStateParams {
  soClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  spaceId?: string;
}

export async function getSetupState({
  createProfilingEsClient,
  deps,
  esClient,
  logger,
  soClient,
  spaceId,
}: RegisterServicesParams & SetupStateParams): Promise<CloudSetupStateType | SetupStateType> {
  const kibanaInternalProfilingESClient = createProfilingEsClient({
    esClient: esClient.asInternalUser,
    useDefaultAuth: false,
  });
  const profilingESClient = createProfilingEsClient({
    esClient: esClient.asCurrentUser,
    useDefaultAuth: false,
  });

  const isCloudEnabled = deps.cloud?.isCloudEnabled;
  if (isCloudEnabled) {
    if (!deps.fleet) {
      throw new Error('Elastic Fleet is required to set up Universal Profiling on Cloud');
    }

    const setupState = await cloudSetupState({
      client: kibanaInternalProfilingESClient,
      clientWithProfilingAuth: profilingESClient,
      logger,
      soClient,
      spaceId: spaceId ?? DEFAULT_SPACE_ID,
      packagePolicyClient: deps.fleet.packagePolicyService,
      isCloudEnabled,
    });

    return {
      type: 'cloud',
      setupState,
    };
  }

  const setupState = await selfManagedSetupState({
    client: kibanaInternalProfilingESClient,
    clientWithProfilingAuth: profilingESClient,
    logger,
    soClient,
    spaceId: spaceId ?? DEFAULT_SPACE_ID,
  });

  return {
    type: 'self-managed',
    setupState,
  };
}

export function createSetupState(params: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: SetupStateParams) =>
    getSetupState({ ...params, esClient, soClient, spaceId });
}
