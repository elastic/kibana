/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleType } from '../helpers/create_role';

export const readOnlyUserRole: RoleType = {
  elasticsearch: {
    run_as: [],
    cluster: [],
    indices: [
      // apm
      {
        names: [
          'apm-*',
          'logs-apm*',
          'metrics-apm*',
          'traces-apm*',
          'observability-annotations',
        ],
        privileges: ['read', 'view_index_metadata'],
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
        discover: ['read'],
        dashboard: ['read'],
        canvas: ['read'],
        ml: ['read'],
        maps: ['read'],
        graph: ['read'],
        visualize: ['read'],

        // observability
        logs: ['read'],
        infrastructure: ['read'],
        apm: ['read'],
        uptime: ['read'],

        // security
        siem: ['read'],

        // management
        dev_tools: ['read'],
        advancedSettings: ['read'],
        indexPatterns: ['read'],
        savedObjectsManagement: ['read'],
        stackAlerts: ['read'],
        fleet: ['read'],
        actions: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
