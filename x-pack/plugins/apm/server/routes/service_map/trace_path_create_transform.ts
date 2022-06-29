/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { tracePathsAggs } from './trace_path_preview';

// client.transform.putTransform(...)
// client.transform.startTransform(...)

const transform = {
  dest: {
    index: 'apm_trace_paths',
  },
  source: {
    index: 'traces-apm*',
    query: {
      bool: {
        filter: [
          {
            prefix: {
              'trace.id': '1',
            },
          },
          {
            terms: {
              [PROCESSOR_EVENT]: ['span', 'transaction'],
            },
          },
        ],
      },
    },
  },
  pivot: {
    group_by: {
      trace_id: {
        terms: {
          field: TRACE_ID,
        },
      },
    },
    aggs: tracePathsAggs,
  },
  description: 'APM trace paths',
  frequency: '10m',
  sync: {
    time: {
      field: '@timestamp',
      delay: '60s',
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: '30d',
    },
  },
};
