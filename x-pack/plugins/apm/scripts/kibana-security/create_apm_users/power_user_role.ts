/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleType } from './create_role';

export const powerUserRole: RoleType = {
  elasticsearch: { cluster: [], indices: [], run_as: [] },
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
