/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const clusterPrivileges = [
  'all',
  'monitor',
  'manage',
  'manage_security',
  'manage_index_templates',
  'manage_pipeline',
  'manage_ingest_pipelines',
  'transport_client',
  'manage_ml',
  'monitor_ml',
  'manage_watcher',
  'monitor_watcher',
  'read_ccr',
  'manage_ccr',
];
const indexPrivileges = [
  'all',
  'manage',
  'monitor',
  'read',
  'index',
  'create',
  'delete',
  'write',
  'delete_index',
  'create_index',
  'view_index_metadata',
  'read_cross_cluster',
  'manage_follow_index',
];

export function getClusterPrivileges() {
  return [...clusterPrivileges];
}

export function getIndexPrivileges() {
  return [...indexPrivileges];
}
