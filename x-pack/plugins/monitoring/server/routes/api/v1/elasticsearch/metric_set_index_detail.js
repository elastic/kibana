/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const metricSet = {
  advanced: [
    {
      keys: ['index_mem_fixed_bit_set', 'index_mem_versions'],
      name: 'index_3',
    },
    {
      keys: [
        'index_mem_query_cache',
        'index_mem_request_cache',
        'index_mem_fielddata',
        'index_mem_writer',
      ],
      name: 'index_4',
    },
    {
      keys: ['index_searching_total', 'index_indexing_total'],
      name: 'index_total',
    },
    {
      keys: ['index_searching_time', 'index_indexing_total_time', 'index_indexing_primaries_time'],
      name: 'index_time',
    },
    {
      keys: ['index_throttling_indexing_total_time', 'index_throttling_indexing_primaries_time'],
      name: 'index_throttling',
    },
    {
      keys: ['index_segment_refresh_total_time', 'index_segment_refresh_primaries_time'],
      name: 'index_refresh',
    },
    {
      keys: [
        'index_store_total_size',
        'index_store_primaries_size',
        'index_segment_merge_total_size',
        'index_segment_merge_primaries_size',
      ],
      name: 'index_disk',
    },
    {
      keys: ['index_segment_count_total', 'index_segment_count_primaries'],
      name: 'index_segment_count',
    },
    {
      keys: ['index_index_latency', 'index_query_latency'],
      name: 'index_latency',
    },
  ],
  overview: [
    'index_search_request_rate',
    {
      keys: ['index_request_rate_total', 'index_request_rate_primary'],
      name: 'index_request_rate',
    },
    {
      keys: ['index_store_total_size', 'index_store_primaries_size'],
      name: 'index_size',
    },
    'index_document_count',
    {
      keys: ['index_segment_count_total', 'index_segment_count_primaries'],
      name: 'index_segment_count',
    },
  ],
};
