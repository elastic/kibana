/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSETS_INDEX_PREFIX = 'assets';
export const ASSET_MANAGER_API_BASE = '/api/asset-manager';

// How do we even know these are the right indices to hit?
export const LOGS_INDICES = 'remote_cluster:logs-*,remote_cluster:filebeat-*';
export const APM_INDICES =
  'remote_cluster:traces-*,remote_cluster:apm*,remote_cluster:metrics-apm*,remote_cluster:logs-apm*';
export const METRICS_INDICES = 'remote_cluster:metrics-*,remote_cluster:metricbeat-*';
