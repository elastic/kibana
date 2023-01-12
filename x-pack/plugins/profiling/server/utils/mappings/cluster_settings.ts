/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ClusterApi from '@elastic/elasticsearch/lib/api/api/cluster';
import { ClusterPutSettingsResponse } from '@elastic/elasticsearch/lib/api/types';

export async function putClusterSettings(client: ClusterApi): Promise<ClusterPutSettingsResponse> {
  return client.putSettings({
    persistent: {
      search: {
        max_buckets: 150000,
      },
    },
  });
}
