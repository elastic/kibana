/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaEventsRateClusterMetric, KibanaMetric } from './classes';
import {
  LARGE_FLOAT,
  SMALL_FLOAT,
  LARGE_BYTES
} from '../../../../common/formatting';

export const metrics = {
  kibana_cluster_requests: new KibanaEventsRateClusterMetric({
    field: 'kibana_stats.requests.total',
    label: 'Client Requests',
    description:
      'Total number of client requests received by the Kibana instance.',
    format: SMALL_FLOAT,
    units: ''
  }),
  kibana_cluster_max_response_times: new KibanaEventsRateClusterMetric({
    title: 'Client Response Time',
    field: 'kibana_stats.response_times.max',
    label: 'Max',
    description:
      'Maximum response time for client requests to the Kibana instance.',
    format: SMALL_FLOAT,
    units: 'ms'
  }),
  kibana_cluster_average_response_times: new KibanaEventsRateClusterMetric({
    title: 'Client Response Time',
    field: 'kibana_stats.response_times.average',
    label: 'Average',
    description:
      'Average response time for client requests to the Kibana instance.',
    format: SMALL_FLOAT,
    units: 'ms'
  }),
  kibana_os_load_1m: new KibanaMetric({
    title: 'System Load',
    field: 'kibana_stats.os.load.1m',
    label: '1m',
    description: 'Load average over the last minute.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  kibana_os_load_5m: new KibanaMetric({
    title: 'System Load',
    field: 'kibana_stats.os.load.5m',
    label: '5m',
    description: 'Load average over the last 5 minutes.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  kibana_os_load_15m: new KibanaMetric({
    title: 'System Load',
    field: 'kibana_stats.os.load.15m',
    label: '15m',
    description: 'Load average over the last 15 minutes.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  kibana_memory_heap_size_limit: new KibanaMetric({
    title: 'Memory Size',
    field: 'kibana_stats.process.memory.heap.size_limit',
    label: 'Heap Size Limit',
    description: 'Limit of memory usage before garbage collection.',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  kibana_memory_size: new KibanaMetric({
    title: 'Memory Size',
    field: 'kibana_stats.process.memory.resident_set_size_in_bytes',
    label: 'Memory Size',
    description: 'Total heap used by Kibana running in Node.js.',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  kibana_process_delay: new KibanaMetric({
    field: 'kibana_stats.process.event_loop_delay',
    label: 'Event Loop Delay',
    description:
      'Delay in Kibana server event loops. Longer delays may indicate blocking events in server thread, such as synchronous functions taking large amount of CPU time.', // eslint-disable-line max-len
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  kibana_average_response_times: new KibanaMetric({
    title: 'Client Response Time',
    field: 'kibana_stats.response_times.average',
    label: 'Average',
    description:
      'Average response time for client requests to the Kibana instance.',
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  kibana_max_response_times: new KibanaMetric({
    title: 'Client Response Time',
    field: 'kibana_stats.response_times.max',
    label: 'Max',
    description:
      'Maximum response time for client requests to the Kibana instance.',
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  kibana_average_concurrent_connections: new KibanaMetric({
    field: 'kibana_stats.concurrent_connections',
    label: 'HTTP Connections',
    description:
      'Total number of open socket connections to the Kibana instance.',
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  kibana_requests: new KibanaMetric({
    field: 'kibana_stats.requests.total',
    label: 'Client Requests',
    description:
      'Total number of client requests received by the Kibana instance.',
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: ''
  })
};
