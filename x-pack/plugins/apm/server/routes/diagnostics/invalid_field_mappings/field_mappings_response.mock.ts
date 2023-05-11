/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetFieldMappingResponse } from '@elastic/elasticsearch/lib/api/types';

export const fieldMappingResponse: IndicesGetFieldMappingResponse = {
  '.ds-metrics-apm.service_destination.1m-default-2023.04.17-000001': {
    mappings: {
      'service.name': {
        full_name: 'service.name',
        mapping: {
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    },
  },
  '.ds-metrics-apm.internal-default-2023.04.16-000015': {
    mappings: {
      'service.name': {
        full_name: 'service.name',
        mapping: {
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    },
  },
  '.ds-traces-apm.rum-default-2023.04.14-000003': {
    mappings: {
      'service.name': {
        full_name: 'service.name',
        mapping: {
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    },
  },
  'apm-7.15.0-transaction-000011': {
    mappings: {
      'error.grouping_key': {
        full_name: 'error.grouping_key',
        mapping: {
          grouping_key: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      'service.name': {
        full_name: 'service.name',
        mapping: {
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    },
  },
  'apm-7.15.0-transaction-000012': {
    mappings: {
      'error.grouping_key': {
        full_name: 'error.grouping_key',
        mapping: {
          grouping_key: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      'service.name': {
        full_name: 'service.name',
        mapping: {
          name: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
    },
  },
  'logs-apm-default': {
    mappings: {
      'error.grouping_key': {
        full_name: 'error.grouping_key',
        mapping: {
          grouping_key: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
        },
      },
    },
  },
  'traces-apm-default': {
    mappings: {
      'service.name': {
        full_name: 'service.name',
        mapping: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
        },
      },
    },
  },
};
