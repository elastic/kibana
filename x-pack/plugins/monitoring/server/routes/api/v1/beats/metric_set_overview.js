/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSet = [
  {
    keys: [
      'beat_cluster_pipeline_events_total_rate',
      'beat_cluster_output_events_total',
      'beat_cluster_output_events_ack_rate',
      'beat_cluster_pipeline_events_emitted_rate',
    ],
    name: 'beat_event_rates',
  },
  {
    keys: [
      'beat_cluster_pipeline_events_failed_rate',
      'beat_cluster_pipeline_events_dropped_rate',
      'beat_cluster_output_events_dropped_rate',
      'beat_cluster_pipeline_events_retry_rate',
    ],
    name: 'beat_fail_rates',
  },
  {
    keys: ['beat_cluster_output_write_bytes_rate', 'beat_cluster_output_read_bytes_rate'],
    name: 'beat_throughput_rates',
  },
  {
    keys: ['beat_cluster_output_sending_errors', 'beat_cluster_output_receiving_errors'],
    name: 'beat_output_errors',
  },
];
