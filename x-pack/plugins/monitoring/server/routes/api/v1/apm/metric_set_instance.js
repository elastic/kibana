/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  {
    keys: [
      'apm_acm_response_count',
      'apm_acm_response_errors_count',
      'apm_acm_response_valid_ok',
      'apm_acm_response_valid_notmodified',
    ],
    name: 'apm_acm_response',
  },
  {
    keys: [
      'apm_acm_response_errors_forbidden',
      'apm_acm_response_errors_unauthorized',
      'apm_acm_response_errors_unavailable',
      'apm_acm_response_errors_method',
      'apm_acm_response_errors_invalidquery',
    ],
    name: 'apm_acm_response_errors',
  },
  {
    keys: ['apm_acm_request_count'],
    name: 'apm_acm_request_count',
  },
];
