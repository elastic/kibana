/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialSetupState, ProfilingCloudSetupOptions } from './cloud_setup';

export const MAX_BUCKETS = 150000;

export async function validateMaximumBuckets({
  client,
}: ProfilingCloudSetupOptions): Promise<PartialSetupState> {
  const settings = await client.getEsClient().cluster.getSettings({});
  const maxBuckets = settings.persistent.search?.max_buckets;
  return {
    settings: {
      configured: maxBuckets === MAX_BUCKETS.toString(),
    },
  };
}

export async function validateResourceManagement({
  client,
}: ProfilingCloudSetupOptions): Promise<PartialSetupState> {
  const statusResponse = await client.profilingStatus();
  return {
    resource_management: {
      enabled: statusResponse.resource_management.enabled,
    },
    resources: {
      created: statusResponse.resources.created,
      pre_8_9_1_data: statusResponse.resources.pre_8_9_1_data,
    },
  };
}
