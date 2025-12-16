/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { generateLongIdWithSeed } from '@kbn/synthtrace-client/src/lib/utils/generate_id';

export const OPBEANS_START_DATE = '2021-10-10T00:00:00.000Z';
export const OPBEANS_END_DATE = '2021-10-10T00:15:00.000Z';

export const PRODUCT_TRANSACTION_NAME = 'GET /api/product';
// Error constants - based on opbeans synthtrace data
export const ERROR_MESSAGE = '[MockError] Foo';
export const ERROR_GROUPING_KEY = generateLongIdWithSeed(ERROR_MESSAGE);
export const ERROR_GROUPING_KEY_SHORT = ERROR_GROUPING_KEY.slice(0, 5);

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
