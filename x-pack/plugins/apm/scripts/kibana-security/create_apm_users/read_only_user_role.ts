/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleType } from './create_role';

export const readOnlyUserRole: RoleType = {
  elasticsearch: { cluster: [], indices: [], run_as: [] },
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
