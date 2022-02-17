/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const metricSet = [
  // Low level usage metrics
  {
    name: 'enterprise_search_heap',
    keys: [
      'enterprise_search_heap_total',
      'enterprise_search_heap_committed',
      'enterprise_search_heap_used',
    ],
  },
  'enterprise_search_jvm_finalizer_queue',
  'enterprise_search_gc_time',
  'enterprise_search_gc_rate',
  {
    name: 'enterprise_search_threads',
    keys: ['enterprise_search_threads_current', 'enterprise_search_daemon_threads_current'],
  },
  'enterprise_search_threads_rate',

  // Networking metrics
  'enterprise_search_http_connections_current',
  'enterprise_search_http_connections_rate',
  {
    name: 'enterprise_search_http_traffic',
    keys: ['enterprise_search_http_bytes_received_rate', 'enterprise_search_http_bytes_sent_rate'],
  },
  {
    name: 'enterprise_search_http_responses',
    keys: [
      'enterprise_search_http_1xx_rate',
      'enterprise_search_http_2xx_rate',
      'enterprise_search_http_3xx_rate',
      'enterprise_search_http_4xx_rate',
      'enterprise_search_http_5xx_rate',
    ],
  },

  // App Search usage metrics
  'app_search_total_engines',
  {
    name: 'crawler_workers',
    keys: ['crawler_workers_total', 'crawler_workers_active'],
  },

  // Workplace Search usage metrics
  {
    name: 'workplace_search_total_sources',
    keys: ['workplace_search_total_org_sources', 'workplace_search_total_private_sources'],
  },
];
