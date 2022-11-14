/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';

export const getDetectionsEngineer: () => Omit<Role, 'name'> = () => ({
  elasticsearch: {
    cluster: ['manage'],
    indices: [
      {
        names: [
          '.alerts-security.alerts-default',
          '.alerts-security.alerts-*',
          '.siem-signals-*',
          '.items-*',
          '.lists-*',
        ],
        privileges: ['manage', 'write', 'read', 'view_index_metadata'],
      },
    ],
    run_as: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        actions: ['all'],
        advancedSettings: ['all'],
        dev_tools: ['all'],
        fleet: ['all'],
        generalCases: ['all'],
        indexPatterns: ['all'],
        osquery: ['all'],
        savedObjectsManagement: ['all'],
        savedObjectsTagging: ['all'],
        siem: ['minimal_all', 'actions_log_management_read'],
        stackAlerts: ['all'],
      },
      spaces: ['*'],
    },
  ],
});
