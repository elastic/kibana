/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialSetupState, ProfilingSetupOptions } from './setup';

export const PROFILING_READER_ROLE_NAME = 'profiling-reader';
export const METADATA_VERSION = 1;

export async function validateSecurityRole({
  client,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const esClient = client.getEsClient();
  const roles = await esClient.security.getRole();
  const profilingRole = roles[PROFILING_READER_ROLE_NAME];
  return {
    permissions: {
      configured: !!profilingRole && profilingRole.metadata.version === METADATA_VERSION,
    },
  };
}
