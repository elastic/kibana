/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const diskLatency: MetricsUIAggregation = {
  diskio_read_time: {
    avg: {
      field: 'system.diskio.read.time',
    },
  },
  diskio_write_time: {
    avg: {
      field: 'system.diskio.write.time',
    },
  },
  diskio_read_count: {
    avg: {
      field: 'system.diskio.read.count',
    },
  },
  diskio_write_count: {
    avg: {
      field: 'system.diskio.write.count',
    },
  },
  diskLatency: {
    bucket_script: {
      buckets_path: {
        read_time: 'diskio_read_time',
        write_time: 'diskio_write_time',
        read_count: 'diskio_read_count',
        write_count: 'diskio_write_count',
      },
      script: {
        source: '(params.write_time + params.read_time) / (params.read_count + params.write_count)',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
