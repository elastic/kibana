/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BeatsCpuUtilizationMetric,
  BeatsEventsRateClusterMetric,
  BeatsEventsRateMetric,
  BeatsByteRateMetric,
  BeatsByteRateClusterMetric,
  BeatsMetric
} from '../beats/classes';
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

  apm_mem_alloc: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_alloc',
    label: 'Active',
    title: 'Memory',
    description: 'Private memory in active use by the Beat',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  apm_mem_total: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_total',
    label: 'Total',
    title: 'Memory',
    description: 'Private memory in active use by the Beat',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  apm_mem_rss: new ApmMetric({
    field: 'beats_stats.metrics.beat.memstats.rss',
    label: 'Process Total',
    title: 'Memory',
    description: 'Resident set size of memory reserved by the Beat from the OS',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
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
};

export const metrics2 = {
  beat_cluster_pipeline_events_total_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.total',
    title: 'Events Rate',
    label: 'Total',
    description: 'All events newly created in the publishing pipeline'
  }),
  beat_cluster_output_events_total: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.total',
    title: 'Events Rate',
    label: 'Emitted',
    description: 'Events processed by the output (including retries)'
  }),
  beat_cluster_output_events_ack_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.acked',
    title: 'Events Rate',
    label: 'Acknowledged',
    description:
      'Events acknowledged by the output (includes events dropped by the output)'
  }),
  beat_cluster_pipeline_events_emitted_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.published',
    title: 'Events Rate',
    label: 'Queued',
    description: 'Events added to the event pipeline queue'
  }),

  beat_cluster_output_write_bytes_rate: new BeatsByteRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.write.bytes',
    title: 'Throughput',
    label: 'Bytes Sent',
    description:
      'Bytes written to the output (consists of size of network headers and compressed payload)'
  }),
  beat_cluster_output_read_bytes_rate: new BeatsByteRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.read.bytes',
    title: 'Throughput',
    label: 'Bytes Received',
    description: 'Bytes read in response from the output'
  }),

  beat_cluster_pipeline_events_failed_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.failed',
    title: 'Fail Rates',
    label: 'Failed in Pipeline',
    description:
      'Failures that happened before event was added to the publishing pipeline (output was disabled or publisher client closed)'
  }),
  beat_cluster_pipeline_events_dropped_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.dropped',
    title: 'Fail Rates',
    label: 'Dropped in Pipeline',
    description:
      'Events that have been dropped after N retries (N = max_retries setting)'
  }),
  beat_cluster_output_events_dropped_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.events.dropped',
    title: 'Fail Rates',
    label: 'Dropped in Output',
    description:
      '(Fatal drop) Events dropped by the output as being "invalid." The output ' +
      'still acknowledges the event for the Beat to remove it from the queue.'
  }),
  beat_cluster_pipeline_events_retry_rate: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.retry',
    title: 'Fail Rates',
    label: 'Retry in Pipeline',
    description:
      'Events in the pipeline that are trying again to be sent to the output'
  }),

  beat_cluster_output_sending_errors: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.write.errors',
    title: 'Output Errors',
    label: 'Sending',
    description: 'Errors in writing the response from the output'
  }),
  beat_cluster_output_receiving_errors: new BeatsEventsRateClusterMetric({
    field: 'beats_stats.metrics.libbeat.output.read.errors',
    title: 'Output Errors',
    label: 'Receiving',
    description: 'Errors in reading the response from the output'
  }),

  /*
   * Beat Detail
   */

  beat_pipeline_events_total_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.total',
    title: 'Events Rate',
    label: 'New',
    description: 'New events sent to the publishing pipeline'
  }),
  beat_output_events_total: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.events.total',
    title: 'Events Rate',
    label: 'Emitted',
    description: 'Events processed by the output (including retries)'
  }),
  beat_output_events_ack_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.events.acked',
    title: 'Events Rate',
    label: 'Acknowledged',
    description:
      'Events acknowledged by the output (includes events dropped by the output)'
  }),
  beat_pipeline_events_emitted_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.published',
    title: 'Events Rate',
    label: 'Queued',
    description: 'Events added to the event pipeline queue'
  }),

  beat_pipeline_events_failed_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.failed',
    title: 'Fail Rates',
    label: 'Failed in Pipeline',
    description:
      'Failures that happened before event was added to the publishing pipeline (output was disabled or publisher client closed)'
  }),
  beat_pipeline_events_dropped_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.dropped',
    title: 'Fail Rates',
    label: 'Dropped in Pipeline',
    description:
      'Events that have been dropped after N retries (N = max_retries setting)'
  }),
  beat_output_events_dropped_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.events.dropped',
    title: 'Fail Rates',
    label: 'Dropped in Output',
    description:
      '(Fatal drop) Events dropped by the output as being "invalid." The output ' +
      'still acknowledges the event for the Beat to remove it from the queue.'
  }),
  beat_pipeline_events_retry_rate: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.pipeline.events.retry',
    title: 'Fail Rates',
    label: 'Retry in Pipeline',
    description:
      'Events in the pipeline that are trying again to be sent to the output'
  }),

  beat_bytes_written: new BeatsByteRateMetric({
    field: 'beats_stats.metrics.libbeat.output.write.bytes',
    title: 'Throughput',
    label: 'Bytes Sent',
    description:
      'Bytes written to the output (consists of size of network headers and compressed payload)'
  }),
  beat_output_write_bytes_rate: new BeatsByteRateMetric({
    field: 'beats_stats.metrics.libbeat.output.read.bytes',
    title: 'Throughput',
    label: 'Bytes Received',
    description: 'Bytes read in response from the output'
  }),

  beat_output_sending_errors: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.write.errors',
    title: 'Output Errors',
    label: 'Sending',
    description: 'Errors in writing the response from the output'
  }),
  beat_output_receiving_errors: new BeatsEventsRateMetric({
    field: 'beats_stats.metrics.libbeat.output.read.errors',
    title: 'Output Errors',
    label: 'Receiving',
    description: 'Errors in reading the response from the output'
  }),

  beat_mem_alloc: new BeatsMetric({
    field: 'beats_stats.metrics.beat.memstats.memory_alloc',
    label: 'Active',
    title: 'Memory',
    description: 'Private memory in active use by the Beat',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  beat_mem_rss: new BeatsMetric({
    field: 'beats_stats.metrics.beat.memstats.rss',
    label: 'Process Total',
    title: 'Memory',
    description: 'Resident set size of memory reserved by the Beat from the OS',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  beat_mem_gc_next: new BeatsMetric({
    field: 'beats_stats.metrics.beat.memstats.gc_next',
    label: 'GC Next',
    title: 'Memory',
    description:
      'Limit of allocated memory at which garbage collection will occur',
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),

  beat_cpu_utilization: new BeatsCpuUtilizationMetric({
    title: 'CPU Utilization',
    label: 'Total',
    description:
      'Percentage of CPU time spent executing (user+kernel mode) for the Beat process',
    field: 'beats_stats.metrics.beat.cpu.total.value'
  }),

  beat_system_os_load_1: new BeatsMetric({
    field: 'beats_stats.metrics.system.load.1',
    label: '1m',
    title: 'System Load',
    description: 'Load average over the last 1 minute',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  beat_system_os_load_5: new BeatsMetric({
    field: 'beats_stats.metrics.system.load.5',
    label: '5m',
    title: 'System Load',
    description: 'Load average over the last 5 minutes',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  beat_system_os_load_15: new BeatsMetric({
    field: 'beats_stats.metrics.system.load.15',
    label: '15m',
    title: 'System Load',
    description: 'Load average over the last 15 minutes',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  })
};
