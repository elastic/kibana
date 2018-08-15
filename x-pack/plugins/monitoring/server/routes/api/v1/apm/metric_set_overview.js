/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSet = [
  {
    name: 'apm_cpu',
    keys: [
      'apm_cpu_total'
    ]
  },
  {
    keys: [
      'apm_system_os_load_1',
      'apm_system_os_load_5',
      'apm_system_os_load_15'
    ],
    name: 'apm_os_load'
  },
  {
    keys: ['apm_mem_total', 'apm_mem_alloc', 'apm_mem_rss', 'apm_mem_gc_next'],
    name: 'apm_memory'
  },
  {
    keys: [
      'apm_output_events_total',
    ],
    name: 'apm_output_events_rate'
  },
  {
    keys: [
      'apm_requests'
    ],
    name: 'apm_requests'
  }
  // {
  //   keys: [
  //     'beat_cluster_pipeline_events_failed_rate',
  //     'beat_cluster_pipeline_events_dropped_rate',
  //     'beat_cluster_output_events_dropped_rate',
  //     'beat_cluster_pipeline_events_retry_rate'
  //   ],
  //   name: 'beat_fail_rates'
  // },
  // {
  //   keys: [
  //     'beat_cluster_output_write_bytes_rate',
  //     'beat_cluster_output_read_bytes_rate'
  //   ],
  //   name: 'beat_throughput_rates'
  // },
  // {
  //   keys: [
  //     'beat_cluster_output_sending_errors',
  //     'beat_cluster_output_receiving_errors'
  //   ],
  //   name: 'beat_output_errors'
  // }
];
