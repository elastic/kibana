/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

const module = uiModules.get('security', []);
module.constant('shieldPrivileges', {
  cluster: [
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
  ],
  indices: [
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
  ]
});
