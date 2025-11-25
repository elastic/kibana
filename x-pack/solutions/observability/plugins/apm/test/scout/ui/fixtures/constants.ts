/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';

export const OPBEANS_START_DATE = '2021-10-10T00:00:00.000Z';
export const OPBEANS_END_DATE = '2021-10-10T00:15:00.000Z';

// APM-specific role definitions matching authentication.ts
export const APM_ROLES = {
  apmAllPrivilegesWithoutWriteSettings: {
    elasticsearch: {
      cluster: ['manage_api_key'],
      indices: [
        {
          names: ['apm-*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        feature: { apm: ['minimal_all'], ml: ['all'] },
        spaces: ['*'],
      },
    ],
  } as KibanaRole,

  apmReadPrivilegesWithWriteSettings: {
    elasticsearch: {
      cluster: ['manage_api_key'],
      indices: [
        {
          names: ['traces-apm*', 'logs-apm*', 'metrics-apm*', 'apm-*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        feature: {
          apm: ['minimal_read', 'settings_save'],
          advancedSettings: ['all'],
          ml: ['all'],
          savedObjectsManagement: ['all'],
        },
        spaces: ['*'],
      },
    ],
  } as KibanaRole,

  apmMonitor: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [
        {
          names: ['traces-apm*', 'logs-apm*', 'metrics-apm*', 'apm-*'],
          privileges: ['monitor', 'read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        feature: {
          apm: ['minimal_all', 'read', 'settings_save'],
        },
        spaces: ['*'],
      },
    ],
  } as KibanaRole,
};
