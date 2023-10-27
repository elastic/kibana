/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METADATA_VERSION,
  PROFILING_READER_ROLE_NAME,
} from '@kbn/profiling-data-access-plugin/common';
import { ProfilingSetupOptions } from '@kbn/profiling-data-access-plugin/common/setup';

export async function setSecurityRole({ client }: ProfilingSetupOptions) {
  const esClient = client.getEsClient();
  await esClient.security.putRole({
    name: PROFILING_READER_ROLE_NAME,
    indices: [
      {
        names: ['profiling-*', '.profiling-*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
    cluster: ['monitor'],
    metadata: {
      version: METADATA_VERSION,
    },
  });
}
