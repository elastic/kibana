/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';

export const dataStreamsResponse: IndicesGetDataStreamResponse = {
  data_streams: [
    {
      name: 'logs-apm.error-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name: '.ds-logs-apm.error-default-2023.04.16-000017',
          index_uuid: 'miIAMr_8TzW97jD6etuAJw',
        },
      ],
      generation: 19,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'logs-apm.error',
      ilm_policy: 'logs-apm.error_logs-default_policy',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'metrics-apm.internal-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name: '.ds-metrics-apm.internal-default-2023.01.12-000006',
          index_uuid: '1ng7cKe8ToCdZc-8SVw-WQ',
        },
        {
          index_name: '.ds-metrics-apm.internal-default-2023.02.11-000009',
          index_uuid: 'rjhX1aiiQUC8a1iPdwoE-A',
        },
        {
          index_name: '.ds-metrics-apm.internal-default-2023.03.13-000011',
          index_uuid: 'YCx7mEFoRzug2zFGZiT7sg',
        },
        {
          index_name: '.ds-metrics-apm.internal-default-2023.04.12-000014',
          index_uuid: '4uXrpRADS4CZ-1kKuChD4A',
        },
        {
          index_name: '.ds-metrics-apm.internal-default-2023.04.16-000015',
          index_uuid: 'LD5XeQi2R2KyQ_D243mKXQ',
        },
      ],
      generation: 15,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'metrics-apm.internal',
      ilm_policy: 'metrics-apm.internal_metrics-default_policy',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'metrics-apm.service_destination.1m-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name:
            '.ds-metrics-apm.service_destination.1m-default-2023.04.17-000001',
          index_uuid: 'cNJ1q_OjRBOg2QbZ5DHgOg',
        },
      ],
      generation: 1,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'metrics-apm.service_destination.1m',
      ilm_policy:
        'metrics-apm.service_destination_interval_metrics-default_policy.1m',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'metrics-apm.service_summary.1m-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name:
            '.ds-metrics-apm.service_summary.1m-default-2023.04.17-000001',
          index_uuid: 'zZE2o61lTDKS6DkBDdY4JQ',
        },
      ],
      generation: 1,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'metrics-apm.service_summary.1m',
      ilm_policy:
        'metrics-apm.service_summary_interval_metrics-default_policy.1m',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'metrics-apm.service_transaction.1m-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name:
            '.ds-metrics-apm.service_transaction.1m-default-2023.04.17-000001',
          index_uuid: 'AHJ1y_2AQvaI1KZQHO7lbw',
        },
      ],
      generation: 1,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'metrics-apm.service_transaction.1m',
      ilm_policy:
        'metrics-apm.service_transaction_interval_metrics-default_policy.1m',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'metrics-apm.transaction.1m-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name:
            '.ds-metrics-apm.transaction.1m-default-2023.04.17-000001',
          index_uuid: 'AhhqzdEUSUqDAcLFIpmRGQ',
        },
      ],
      generation: 1,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'metrics-apm.transaction.1m',
      ilm_policy: 'metrics-apm.transaction_interval_metrics-default_policy.1m',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'traces-apm-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name: '.ds-traces-apm-default-2023.04.16-000017',
          index_uuid: 'RAS6x45ARhy5dE7A9L_1Fg',
        },
      ],
      generation: 19,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'traces-apm',
      ilm_policy: 'traces-apm.traces-default_policy',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
    {
      name: 'traces-apm.rum-default',
      timestamp_field: {
        name: '@timestamp',
      },
      indices: [
        {
          index_name: '.ds-traces-apm.rum-default-2023.02.13-000001',
          index_uuid: 'qw-jp5DaRsOMG8Wj1IDmhA',
        },
        {
          index_name: '.ds-traces-apm.rum-default-2023.03.15-000002',
          index_uuid: 'v-2jPPGaSUiCAb0LgyJBkw',
        },
        {
          index_name: '.ds-traces-apm.rum-default-2023.04.14-000003',
          index_uuid: 'VmSf_438SJqXFyKQHiHuLA',
        },
      ],
      generation: 3,
      _meta: {
        package: {
          name: 'apm',
        },
        managed_by: 'fleet',
        managed: true,
      },
      status: 'GREEN',
      template: 'traces-apm.rum',
      ilm_policy: 'traces-apm.rum_traces-default_policy',
      hidden: false,
      system: false,
      allow_custom_routing: false,
      replicated: false,
    },
  ],
};
