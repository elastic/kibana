/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { cluster, indices } from './monitoring_config';

export async function hasLogMonitoringPrivileges(
  esClient: ElasticsearchClient
) {
  const res = await esClient.security.hasPrivileges({
    body: {
      index: indices,
      cluster: [...cluster, 'manage_own_api_key'],
    },
  });

  return res.has_all_requested;
}
