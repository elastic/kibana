/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupOptions } from './types';
import { PartialSetupState } from '../../../common/setup';

const PROFILING_READER_ROLE_NAME = 'profiling-reader';

export async function validateSecurityRole({
  client,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const esClient = client.getEsClient();
  const roles = await esClient.security.getRole();
  return {
    permissions: {
      configured: PROFILING_READER_ROLE_NAME in roles,
    },
  };
}

export async function setSecurityRole({ client }: ProfilingSetupOptions) {
  const esClient = client.getEsClient();
  await esClient.security.putRole({
    name: PROFILING_READER_ROLE_NAME,
    indices: [
      {
        names: ['profiling-*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
    cluster: ['monitor'],
  });
}
