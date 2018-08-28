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
  ApmSuccessResponseMetric,
  ApmFailureResponseMetric
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
  apm_mem_total: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_total',
    label: 'Total Memory',
    title: 'Memory',
    description:
      'Total memory',
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
    description: 'PLZ FILL ME IN'
  }),

  apm_responses_count: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.count',
    title: 'Response Count',
    label: 'Total',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_success: new ApmSuccessResponseMetric({
    field: 'beats_stats.metrics.apm-server.server.response.count',
    title: 'Success',
    label: 'Success',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_failure: new ApmFailureResponseMetric({
    field: 'beats_stats.metrics.apm-server.server.response.count',
    title: 'Success Rate',
    label: 'Failure',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_valid_ok: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.valid.ok',
    title: 'Ok',
    label: 'Ok',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_valid_accepted: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.valid.accepted',
    title: 'Accepted',
    label: 'Accepted',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_toolarge: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.toolarge',
    title: 'Response Errors',
    label: 'Too large',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_validate: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.validate',
    title: 'Validate',
    label: 'Validate',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_method: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.method',
    title: 'Method',
    label: 'Method',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_unauthorized: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.unauthorized',
    title: 'Unauthorized',
    label: 'Unauthorized',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_ratelimit: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.ratelimit',
    title: 'Rate limit',
    label: 'Rate limit',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_queue: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.queue',
    title: 'Queue',
    label: 'Queue',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_decode: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.decode',
    title: 'Decode',
    label: 'Decode',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_forbidden: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.forbidden',
    title: 'Forbidden',
    label: 'Forbidden',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_concurrency: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.concurrency',
    title: 'Concurrency',
    label: 'Concurrency',
    description: 'PLZ FILL ME IN'
  }),
  apm_responses_errors_closed: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.server.response.errors.closed',
    title: 'Closed',
    label: 'Closed',
    description: 'PLZ FILL ME IN'
  }),

  apm_decoder_deflate_contentlength: new ApmMetric({
    field: 'beats_stats.metrics.apm-server.decoder.deflate.content-length',
    label: 'Deflater',
    title: 'Incoming Requests Size',
    description: 'PLZ FILL ME IN',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  apm_decoder_gzip_contentlength: new ApmMetric({
    field: 'beats_stats.metrics.apm-server.decoder.gzip.content-length',
    label: 'Gzip',
    title: 'Gzip',
    description: 'PLZ FILL ME IN',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  apm_decoder_uncompressed_contentlength: new ApmMetric({
    field: 'beats_stats.metrics.apm-server.decoder.uncompressed.content-length',
    label: 'Uncompressed',
    title: 'Uncompressed',
    description: 'PLZ FILL ME IN',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),

  apm_processor_transaction_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.transaction.transformations',
    title: 'Transformations',
    label: 'Transaction',
    description: 'PLZ FILL ME IN'
  }),
  apm_processor_span_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.span.transformations',
    title: 'Transformations',
    label: 'Span',
    description: 'PLZ FILL ME IN'
  }),
  apm_processor_error_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.error.transformations',
    title: 'Transformations',
    label: 'Error',
    description: 'PLZ FILL ME IN'
  }),
  apm_processor_metric_transformations: new ApmEventsRateClusterMetric({
    field: 'beats_stats.metrics.apm-server.processor.metric.transformations',
    title: 'Transformations',
    label: 'Metric',
    description: 'PLZ FILL ME IN'
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
