/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSet = [
  {
    keys: [
      'beat_pipeline_events_total_rate',
      'beat_output_events_total',
      'beat_output_events_ack_rate',
      'beat_pipeline_events_emitted_rate',
    ],
    name: 'beat_event_rates',
  },
  {
    keys: [
      'beat_pipeline_events_failed_rate',
      'beat_pipeline_events_dropped_rate',
      'beat_output_events_dropped_rate',
      'beat_pipeline_events_retry_rate',
    ],
    name: 'beat_fail_rates',
  },
  {
    keys: ['beat_bytes_written', 'beat_output_write_bytes_rate'],
    name: 'beat_throughput_rates',
  },
  {
    keys: ['beat_output_sending_errors', 'beat_output_receiving_errors'],
    name: 'beat_output_errors',
  },
  {
    keys: ['beat_mem_alloc', 'beat_mem_rss', 'beat_mem_gc_next'],
    name: 'beat_memory',
  },
  'beat_cpu_utilization',
  {
    keys: ['beat_system_os_load_1', 'beat_system_os_load_5', 'beat_system_os_load_15'],
    name: 'beat_os_load',
  },
  {
    name: 'beat_handles',
    keys: ['beat_handles_open'],
  },
];
