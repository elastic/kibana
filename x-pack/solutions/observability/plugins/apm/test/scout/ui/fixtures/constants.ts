/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { generateLongIdWithSeed } from '@kbn/synthtrace-client/src/lib/utils/generate_id';

export const START_DATE = '2021-10-10T00:00:00.000Z';
export const END_DATE = '2021-10-10T00:15:00.000Z';
export const EXTENDED_TIMEOUT = 45000;

export const SERVICE_OPBEANS_NODE = 'opbeans-node';
export const SERVICE_OPBEANS_JAVA = 'opbeans-java';
export const SERVICE_OPBEANS_RUM = 'opbeans-rum';
export const SERVICE_GO = 'service-go';
export const SERVICE_NODE = 'service-node';
export const OPBEANS_JAVA_INSTANCE = 'opbeans-java-prod-1';
export const PRODUCTION_ENVIRONMENT = 'production';

export const SERVICE_OTEL_SENDOTLP = 'sendotlp-otel-native-synth';
export const OTEL_INSTANCE_ID = '89117ac1-0dbf-4488-9e17-4c2c3b76943a';
export const OTEL_TRANSACTION_NAME = 'parent-synth';

export const SERVICE_EDOT_ADSERVICE = 'adservice-edot-synth';
export const EDOT_INSTANCE_ID = 'da7a8507-53be-421c-8d77-984f12397213';
export const EDOT_TRANSACTION_NAME = 'oteldemo.AdServiceEdotSynth/GetAds';
export const EDOT_ERROR_MESSAGE = '[ResponseError] index_not_found_exception';

export const SERVICE_MOBILE_ANDROID = 'synth-android';
export const SERVICE_MOBILE_IOS = 'synth-ios';
export const SERVICE_SYNTH_GO = 'synth-go-1';
export const SERVICE_SYNTH_GO_2 = 'synth-go-2';
export const SERVICE_SYNTH_NODE_1 = 'synth-node-1';

export const PRODUCT_TRANSACTION_NAME = 'GET /api/product';
export const PRODUCT_BY_ID_TRANSACTION_NAME = 'GET /api/product/:id';
// Error constants - based on opbeans synthtrace data
export const ERROR_MESSAGE = '[MockError] Foo';
export const ERROR_GROUPING_KEY = generateLongIdWithSeed(ERROR_MESSAGE);
export const ERROR_GROUPING_KEY_SHORT = ERROR_GROUPING_KEY.slice(0, 5);

// Span links test data dates
export const SPAN_LINKS_START_DATE = '2022-01-01T00:00:00.000Z';
export const SPAN_LINKS_END_DATE = '2022-01-01T00:15:00.000Z';
export const SPAN_LINKS_PRODUCER_INTERNAL_ONLY_END = '2022-01-01T00:01:00.000Z';
export const SERVICE_SPAN_LINKS_PRODUCER_INTERNAL_ONLY = 'zzz-producer-internal-only';
export const SERVICE_SPAN_LINKS_CONSUMER_MULTIPLE = 'zzz-consumer-multiple';

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
