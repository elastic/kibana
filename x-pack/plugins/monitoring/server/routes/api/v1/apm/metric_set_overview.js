/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const metricSet = [
  {
    name: 'apm_cpu',
    keys: ['apm_cpu_total'],
  },
  {
    keys: ['apm_system_os_load_1', 'apm_system_os_load_5', 'apm_system_os_load_15'],
    name: 'apm_os_load',
  },
  {
    keys: ['apm_mem_alloc', 'apm_mem_rss', 'apm_mem_gc_next'],
    name: 'apm_memory',
  },
  {
    keys: ['apm_cgroup_memory_usage', 'apm_cgroup_memory_limit', 'apm_mem_gc_next'],
    name: 'apm_memory_cgroup',
  },
  {
    keys: ['apm_output_events_total', 'apm_output_events_active', 'apm_output_events_acked'],
    name: 'apm_output_events_rate_success',
  },
  {
    keys: ['apm_output_events_failed', 'apm_output_events_dropped'],
    name: 'apm_output_events_rate_failure',
  },
  {
    keys: ['apm_responses_count', 'apm_responses_valid_ok', 'apm_responses_valid_accepted'],
    name: 'apm_responses_valid',
  },
  {
    keys: [
      // 'apm_responses_count',
      'apm_responses_errors_toolarge',
      'apm_responses_errors_validate',
      'apm_responses_errors_method',
      'apm_responses_errors_unauthorized',
      'apm_responses_errors_ratelimit',
      'apm_responses_errors_queue',
      'apm_responses_errors_decode',
      'apm_responses_errors_forbidden',
      'apm_responses_errors_concurrency',
      'apm_responses_errors_closed',
      'apm_responses_errors_internal',
    ],
    name: 'apm_responses_errors',
  },
  {
    keys: ['apm_requests'],
    name: 'apm_requests',
  },
  {
    keys: [
      'apm_processor_transaction_transformations',
      'apm_processor_span_transformations',
      'apm_processor_error_transformations',
      'apm_processor_metric_transformations',
    ],
    name: 'apm_transformations',
  },
];
