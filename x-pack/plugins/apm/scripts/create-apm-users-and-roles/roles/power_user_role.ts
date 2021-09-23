/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleType } from '../helpers/create_role';

export const powerUserRole: RoleType = {
  elasticsearch: {
    run_as: [],
    cluster: [],
    indices: [
      // apm
      {
        names: ['apm-*', 'logs-apm*', 'metrics-apm*', 'traces-apm*'],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        names: ['observability-annotations'],
        privileges: ['read', 'write', 'view_index_metadata'],
      },
      // logs
      {
        names: ['logs-*', 'filebeat-*', 'kibana_sample_data_logs*'],
        privileges: ['read', 'view_index_metadata'],
      },
      // metrics
      {
        names: ['metrics-*', 'metricbeat-*'],
        privileges: ['read', 'view_index_metadata'],
      },
      // uptime
      {
        names: ['heartbeat-*', 'synthetics-*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        // core
        discover: ['all'],
        dashboard: ['all'],
        canvas: ['all'],
        ml: ['all'],
        maps: ['all'],
        graph: ['all'],
        visualize: ['all'],

        // observability
        logs: ['all'],
        infrastructure: ['all'],
        apm: ['all'],
        uptime: ['all'],

        // security
        siem: ['all'],

        // management
        dev_tools: ['all'],
        advancedSettings: ['all'],
        indexPatterns: ['all'],
        savedObjectsManagement: ['all'],
        stackAlerts: ['all'],
        fleet: ['all'],
        actions: ['all'],
      },
      spaces: ['*'],
    },
  ],
};
