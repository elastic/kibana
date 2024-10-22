/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { MONITOR_CLUSTER, INDEX_LOGS_AND_METRICS, WRITE_APM_EVENTS } from './privileges';

export async function hasLogMonitoringPrivileges(esClient: ElasticsearchClient, withAPM = false) {
  const res = await esClient.security.hasPrivileges({
    body: {
      cluster: [MONITOR_CLUSTER, 'manage_own_api_key'],
      index: [INDEX_LOGS_AND_METRICS],
      application: withAPM ? [WRITE_APM_EVENTS] : undefined,
    },
  });

  return res.has_all_requested;
}
