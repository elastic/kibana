/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

/**
 * Grants all cluster read-only operations, like cluster health and state, hot threads, node info, node and cluster stats, and pending cluster tasks.
 */
export const MONITOR_CLUSTER: estypes.SecurityClusterPrivilege = 'monitor';

// https://www.elastic.co/guide/en/fleet/master/grant-access-to-elasticsearch.html#create-api-key-standalone-agent
export const INDEX_LOGS_AND_METRICS: estypes.SecurityIndicesPrivileges = {
  names: ['logs-*-*', 'metrics-*-*'],
  privileges: ['auto_configure', 'create_doc'],
};

// https://www.elastic.co/guide/en/fleet/master/grant-access-to-elasticsearch.html#create-api-key-standalone-agent
export const INDEX_LOGS_METRICS_AND_TRACES: estypes.SecurityIndicesPrivileges = {
  names: ['logs-*-*', 'metrics-*-*', 'traces-*-*'],
  privileges: ['auto_configure', 'create_doc'],
};
