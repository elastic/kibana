/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';
import { RegisterServicesParams } from '../register_services';

interface HasSetupParams {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  spaceId?: string;
}

interface ProfilingSetupOptions {
  client: ProfilingESClient;
  soClient: SavedObjectsClientContract;
  packagePolicyClient: PackagePolicyClient;
  logger?: Logger;
  spaceId: string;
  isCloudEnabled: boolean;
}

export function createHasSetupService({ createProfilingEsClient, deps }: RegisterServicesParams) {
  return async ({ esClient, soClient, spaceId }: HasSetupParams) => {
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
      // logger,
      packagePolicyClient: deps.fleet.packagePolicyService,
      soClient,
      spaceId: spaceId ?? DEFAULT_SPACE_ID,
      isCloudEnabled: deps.cloud.isCloudEnabled,
    };
  };
}
