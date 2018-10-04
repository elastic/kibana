/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LARGE_BYTES, LARGE_FLOAT } from '../../../../common/formatting';
import {
  ApmMetric,
  ApmCpuUtilizationMetric,
  ApmEventsRateClusterMetric,
} from './classes';

export const metrics = {
  apm_cpu_total: new ApmCpuUtilizationMetric({
    title: 'CPU Utilization',
    label: 'Total',
    description:
      'Percentage of CPU time spent executing (user+kernel mode) for the APM process',
    field: 'beats_stats.metrics.beat.cpu.total.value'
  }),
  apm_system_os_load_1: new ApmMetric({
    field: 'beats_stats.metrics.system.load.1',
    label: '1m',
    title: 'System Load',
    description: 'Load average over the last 1 minute',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  apm_system_os_load_5: new ApmMetric({
    field: 'beats_stats.metrics.system.load.5',
    label: '5m',
    title: 'System Load',
    description: 'Load average over the last 5 minutes',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  apm_system_os_load_15: new ApmMetric({
    field: 'beats_stats.metrics.system.load.15',
    label: '15m',
    title: 'System Load',
    description: 'Load average over the last 15 minutes',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),

  apm_mem_gc_next: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.gc_next',
    label: 'GC Next',
    title: 'Memory',
    description:
      'Limit of allocated memory at which garbage collection will occur',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  apm_mem_alloc: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_alloc',
    label: 'Allocated Memory',
    title: 'Memory',
    description:
      'Allocated memory',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  apm_mem_rss: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.rss',
    label: 'Process Total',
    title: 'Memory',
    description: 'Resident set size of memory reserved by the APM service from the OS',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),

  apm_requests: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.request.count',
    title: 'Requests',
    label: 'Requested',
    description: 'HTTP Requests received by server'
  }),

  apm_responses_count: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.count',
    title: 'Response Count',
    label: 'Total',
    description: 'HTTP Requests responded to by server'
  }),
  apm_responses_valid_ok: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.valid.ok',
    title: 'Ok',
    label: 'Ok',
    description: '200 OK response count'
  }),
  apm_responses_valid_accepted: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.valid.accepted',
    title: 'Accepted',
    label: 'Accepted',
    description: 'HTTP Requests successfully reporting new events'
  }),
  apm_responses_errors_toolarge: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.toolarge',
    title: 'Response Errors',
    label: 'Too large',
    description: 'HTTP Requests rejected due to excessive payload size'
  }),
  apm_responses_errors_validate: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.validate',
    title: 'Validate',
    label: 'Validate',
    description: 'HTTP Requests rejected due to payload validation error'
  }),
  apm_responses_errors_method: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.method',
    title: 'Method',
    label: 'Method',
    description: 'HTTP Requests rejected due to incorrect HTTP method'
  }),
  apm_responses_errors_unauthorized: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.unauthorized',
    title: 'Unauthorized',
    label: 'Unauthorized',
    description: 'HTTP Requests rejected due to invalid secret token'
  }),
  apm_responses_errors_ratelimit: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.ratelimit',
    title: 'Rate limit',
    label: 'Rate limit',
    description: 'HTTP Requests rejected to due excessive rate limit'
  }),
  apm_responses_errors_queue: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.queue',
    title: 'Queue',
    label: 'Queue',
    description: 'HTTP Requests rejected to due internal queue filling up'
  }),
  apm_responses_errors_decode: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.decode',
    title: 'Decode',
    label: 'Decode',
    description: 'HTTP Requests rejected to due decoding errors - invalid json, incorrect data type for entity'
  }),
  apm_responses_errors_forbidden: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.forbidden',
    title: 'Forbidden',
    label: 'Forbidden',
    description: 'Forbidden HTTP Requests rejected - CORS violation, disabled enpoint'
  }),
  apm_responses_errors_concurrency: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.concurrency',
    title: 'Concurrency',
    label: 'Concurrency',
    description: 'HTTP Requests rejected due to overall concurrency limit breach'
  }),
  apm_responses_errors_closed: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.closed',
    title: 'Closed',
    label: 'Closed',
    description: 'HTTP Requests rejected during server shutdown'
  }),

  apm_processor_transaction_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.transaction.transformations',
    title: 'Processed Events',
    label: 'Transaction',
    description: 'Transaction events processed'
  }),
  apm_processor_span_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.span.transformations',
    title: 'Transformations',
    label: 'Span',
    description: 'Span events processed'
  }),
  apm_processor_error_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.error.transformations',
    title: 'Transformations',
    label: 'Error',
    description: 'Error events processed'
  }),
  apm_processor_metric_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.metric.transformations',
    title: 'Transformations',
    label: 'Metric',
    description: 'Metric events processed'
  }),


  apm_output_events_total: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.total',
    title: 'Output Events Rate',
    label: 'Total',
    description: 'Events processed by the output (including retries)'
  }),
  apm_output_events_failed: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.failed',
    title: 'Output Failed Events Rate',
    label: 'Failed',
    description: 'Events processed by the output (including retries)'
  }),
  apm_output_events_dropped: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.dropped',
    title: 'Output Dropped Events Rate',
    label: 'Dropped',
    description: 'Events processed by the output (including retries)'
  }),
  apm_output_events_active: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.active',
    title: 'Output Active Events Rate',
    label: 'Active',
    description: 'Events processed by the output (including retries)'
  }),
  apm_output_events_acked: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.acked',
    title: 'Output Acked Events Rate',
    label: 'Acked',
    description: 'Events processed by the output (including retries)'
  }),
};
