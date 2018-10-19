/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QuotaMetric } from '../classes';
import {
  RequestRateMetric,
  LatencyMetric,
  ElasticsearchMetric,
  SingleIndexMemoryMetric,
  IndexMemoryMetric,
  NodeIndexMemoryMetric,
  ThreadPoolQueueMetric,
  ThreadPoolRejectedMetric,
  WriteThreadPoolQueueMetric,
  WriteThreadPoolRejectedMetric,
  DifferenceMetric,
  MillisecondsToSecondsMetric,
} from './classes';
import {
  LARGE_FLOAT,
  SMALL_FLOAT,
  SMALL_BYTES,
  LARGE_BYTES,
  LARGE_ABBREVIATED
} from '../../../../common/formatting';

export const metrics = {
  cluster_index_request_rate_primary: new RequestRateMetric({
    title: 'Indexing Rate', // title to use for the chart
    label: 'Primary Shards', // label to use for this line in the chart
    field: 'indices_stats._all.primaries.indexing.index_total',
    description: 'Number of documents being indexed for primary shards.',
    type: 'index'
  }),
  cluster_index_request_rate_total: new RequestRateMetric({
    field: 'indices_stats._all.total.indexing.index_total',
    title: 'Indexing Rate',
    label: 'Total Shards',
    description:
      'Number of documents being indexed for primary and replica shards.',
    type: 'index'
  }),
  cluster_search_request_rate: new RequestRateMetric({
    field: 'indices_stats._all.total.search.query_total',
    title: 'Search Rate',
    label: 'Total Shards',
    description:
      'Number of search requests being executed across primary and replica shards. A single search can run against multiple shards!', // eslint-disable-line max-len
    type: 'cluster'
  }),
  cluster_index_latency: new LatencyMetric({
    metric: 'index',
    fieldSource: 'indices_stats._all.primaries',
    field: 'indices_stats._all.primaries.indexing.index_total',
    label: 'Indexing Latency',
    description:
      'Average latency for indexing documents, which is time it takes to index documents divided by number that were indexed. This only considers primary shards.', // eslint-disable-line max-len
    type: 'cluster'
  }),
  node_index_latency: new LatencyMetric({
    metric: 'index',
    fieldSource: 'node_stats.indices',
    field: 'node_stats.indices.indexing.index_total',
    title: 'Latency',
    label: 'Indexing',
    description:
      'Average latency for indexing documents, which is time it takes to index documents divided by number that were indexed. This considers any shard located on this node, including replicas.', // eslint-disable-line max-len
    type: 'node'
  }),
  index_latency: new LatencyMetric({
    metric: 'index',
    fieldSource: 'index_stats.primaries',
    field: 'index_stats.primaries.indexing.index_total',
    label: 'Indexing Latency',
    description:
      'Average latency for indexing documents, which is time it takes to index documents divided by number that were indexed. This only considers primary shards.', // eslint-disable-line max-len
    type: 'cluster'
  }),
  cluster_query_latency: new LatencyMetric({
    metric: 'query',
    fieldSource: 'indices_stats._all.total',
    field: 'indices_stats._all.total.search.query_total',
    label: 'Search Latency',
    description:
      'Average latency for searching, which is time it takes to execute searches divided by number of searches submitted. This considers primary and replica shards.', // eslint-disable-line max-len
    type: 'cluster'
  }),
  node_query_latency: new LatencyMetric({
    metric: 'query',
    fieldSource: 'node_stats.indices',
    field: 'node_stats.indices.search.query_total',
    title: 'Latency',
    label: 'Search',
    description:
      'Average latency for searching, which is time it takes to execute searches divided by number of searches submitted. This considers primary and replica shards.', // eslint-disable-line max-len
    type: 'node'
  }),
  query_latency: new LatencyMetric({
    metric: 'query',
    fieldSource: 'index_stats.total',
    field: 'index_stats.total.search.query_total',
    label: 'Search Latency',
    description:
      'Average latency for searching, which is time it takes to execute searches divided by number of searches submitted. This considers primary and replica shards.', // eslint-disable-line max-len
    type: 'cluster'
  }),
  index_indexing_primaries_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.index_time_in_millis',
    title: 'Request Time',
    label: 'Indexing (Primaries)',
    description:
      'Amount of time spent performing index operations on primary shards only.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_indexing_total_time: new ElasticsearchMetric({
    field: 'index_stats.total.indexing.index_time_in_millis',
    title: 'Request Time',
    label: 'Indexing',
    description:
      'Amount of time spent performing index operations on primary and replica shards.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_indexing_total: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.index_total',
    title: 'Request Rate',
    label: 'Index Total',
    description: 'Amount of indexing operations.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  index_mem_overall: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: 'Lucene Total',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.'
  }),
  index_mem_overall_1: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    title: 'Index Memory - Lucene 1',
    label: 'Lucene Total',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.'
  }),
  index_mem_overall_2: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    title: 'Index Memory - Lucene 2',
    label: 'Lucene Total',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.'
  }),
  index_mem_overall_3: new SingleIndexMemoryMetric({
    field: 'memory_in_bytes',
    title: 'Index Memory - Lucene 3',
    label: 'Lucene Total',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards.'
  }),
  index_mem_doc_values: new SingleIndexMemoryMetric({
    field: 'doc_values_memory_in_bytes',
    label: 'Doc Values',
    description:
      'Heap memory used by Doc Values. This is a part of Lucene Total.'
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  index_mem_fielddata: new IndexMemoryMetric({
    field: 'index_stats.total.fielddata.memory_size_in_bytes',
    label: 'Fielddata',
    description:
      'Heap memory used by Fielddata (e.g., global ordinals or explicitly enabled fielddata on text fields). This is for the same shards, but not a part of Lucene Total.', // eslint-disable-line max-len
    type: 'index'
  }),
  index_mem_fixed_bit_set: new SingleIndexMemoryMetric({
    field: 'fixed_bit_set_memory_in_bytes',
    label: 'Fixed Bitsets',
    description:
      'Heap memory used by Fixed Bit Sets (e.g., deeply nested documents). This is a part of Lucene Total.'
  }),
  index_mem_norms: new SingleIndexMemoryMetric({
    field: 'norms_memory_in_bytes',
    label: 'Norms',
    description:
      'Heap memory used by Norms (normalization factors for query-time, text scoring). This is a part of Lucene Total.'
  }),
  index_mem_points: new SingleIndexMemoryMetric({
    field: 'points_memory_in_bytes',
    label: 'Points',
    description:
      'Heap memory used by Points (e.g., numbers, IPs, and geo data). This is a part of Lucene Total.'
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  index_mem_query_cache: new IndexMemoryMetric({
    field: 'index_stats.total.query_cache.memory_size_in_bytes',
    title: 'Index Memory - Elasticsearch',
    label: 'Query Cache',
    description:
      'Heap memory used by Query Cache (e.g., cached filters). This is for the same shards, but not a part of Lucene Total.',
    type: 'index'
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  index_mem_request_cache: new IndexMemoryMetric({
    field: 'index_stats.total.request_cache.memory_size_in_bytes',
    label: 'Request Cache',
    description:
      'Heap memory used by Request Cache (e.g., instant aggregations). This is for the same shards, but not a part of Lucene Total.', // eslint-disable-line max-len
    type: 'index'
  }),
  index_mem_stored_fields: new SingleIndexMemoryMetric({
    field: 'stored_fields_memory_in_bytes',
    label: 'Stored Fields',
    description:
      'Heap memory used by Stored Fields (e.g., _source). This is a part of Lucene Total.'
  }),
  index_mem_term_vectors: new SingleIndexMemoryMetric({
    field: 'term_vectors_memory_in_bytes',
    label: 'Term Vectors',
    description:
      'Heap memory used by Term Vectors. This is a part of Lucene Total.'
  }),
  index_mem_terms: new SingleIndexMemoryMetric({
    field: 'terms_memory_in_bytes',
    label: 'Terms',
    description:
      'Heap memory used by Terms (e.g., text). This is a part of Lucene Total.'
  }),
  index_mem_versions: new SingleIndexMemoryMetric({
    field: 'version_map_memory_in_bytes',
    label: 'Version Map',
    description:
      'Heap memory used by Versioning (e.g., updates and deletes). This is NOT a part of Lucene Total.'
  }),
  index_mem_writer: new SingleIndexMemoryMetric({
    field: 'index_writer_memory_in_bytes',
    label: 'Index Writer',
    description:
      'Heap memory used by the Index Writer. This is NOT a part of Lucene Total.'
  }),
  index_request_rate_primary: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.index_total',
    title: 'Indexing Rate',
    label: 'Primary Shards',
    description: 'Number of documents being indexed for primary shards.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '/s',
    type: 'index',
    derivative: true
  }),
  index_request_rate_total: new RequestRateMetric({
    field: 'index_stats.total.indexing.index_total',
    title: 'Indexing Rate',
    label: 'Total Shards',
    description:
      'Number of documents being indexed for primary and replica shards.',
    type: 'index'
  }),
  index_searching_time: new ElasticsearchMetric({
    field: 'index_stats.total.search.query_time_in_millis',
    title: 'Request Time',
    label: 'Search',
    description:
      'Amount of time spent performing search operations (per shard).',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_searching_total: new ElasticsearchMetric({
    field: 'index_stats.total.search.query_total',
    title: 'Request Rate',
    label: 'Search Total',
    description: 'Amount of search operations (per shard).',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  index_segment_count_primaries: new ElasticsearchMetric({
    field: 'index_stats.primaries.segments.count',
    title: 'Segment Count',
    label: 'Primaries',
    description: 'Number of segments for primary shards.',
    type: 'index',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  index_segment_count_total: new ElasticsearchMetric({
    field: 'index_stats.total.segments.count',
    title: 'Segment Count',
    label: 'Total',
    description: 'Number of segments for primary and replica shards.',
    type: 'index',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  index_segment_merge_primaries_size: new ElasticsearchMetric({
    field: 'index_stats.primaries.merges.total_size_in_bytes',
    title: 'Disk',
    label: 'Merges (Primaries)',
    description: 'Size of merges on primary shards.',
    type: 'index',
    derivative: true,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  index_segment_merge_total_size: new ElasticsearchMetric({
    field: 'index_stats.total.merges.total_size_in_bytes',
    title: 'Disk',
    label: 'Merges',
    description: 'Size of merges on primary and replica shards.',
    type: 'index',
    derivative: true,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  index_segment_refresh_primaries_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.refresh.total_time_in_millis',
    title: 'Refresh Time',
    label: 'Primaries',
    description:
      'Amount of time spent to perform refresh operations on primary shards.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_segment_refresh_total_time: new ElasticsearchMetric({
    field: 'index_stats.total.refresh.total_time_in_millis',
    title: 'Refresh Time',
    label: 'Total',
    description:
      'Amount of time spent to perform refresh operations on primary and replica shards.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_throttling_indexing_primaries_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.throttle_time_in_millis',
    title: 'Throttle Time',
    label: 'Indexing (Primaries)',
    description:
      'Amount of time spent throttling index operations on primary shards.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_throttling_indexing_total_time: new ElasticsearchMetric({
    field: 'index_stats.total.indexing.throttle_time_in_millis',
    title: 'Throttle Time',
    label: 'Indexing',
    description:
      'Amount of time spent throttling index operations on primary and replica shards.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_store_primaries_size: new ElasticsearchMetric({
    field: 'index_stats.primaries.store.size_in_bytes',
    title: 'Disk',
    label: 'Store (Primaries)',
    description: 'Size of primary shards on disk.',
    type: 'index',
    derivative: false,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  index_store_total_size: new ElasticsearchMetric({
    field: 'index_stats.total.store.size_in_bytes',
    title: 'Disk',
    label: 'Store',
    description: 'Size of primary and replica shards on disk.',
    type: 'index',
    derivative: false,
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  search_request_rate: new RequestRateMetric({
    field: 'index_stats.total.search.query_total',
    title: 'Search Rate',
    label: 'Total Shards',
    description:
      'Number of search requests being executed across primary and replica shards. A single search can run against multiple shards!', // eslint-disable-line max-len
    type: 'cluster'
  }),
  node_cgroup_periods: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
    title: 'Cgroup CFS Stats',
    label: 'Cgroup Elapsed Periods',
    description:
      'The number of sampling periods from the Completely Fair Scheduler (CFS). Compare against the number of times throttled.',
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: ''
  }),
  node_cgroup_throttled: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpu.stat.time_throttled_nanos',
    title: 'Cgroup CPU Performance',
    label: 'Cgroup Throttling',
    description:
      'The amount of throttled time, reported in nanoseconds, of the Cgroup.',
    type: 'node',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: 'ns'
  }),
  node_cgroup_throttled_count: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpu.stat.number_of_times_throttled',
    title: 'Cgroup CFS Stats',
    label: 'Cgroup Throttled Count',
    description:
      'The number of times that the CPU was throttled by the Cgroup.',
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: ''
  }),
  node_cgroup_usage: new ElasticsearchMetric({
    field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
    title: 'Cgroup CPU Performance',
    label: 'Cgroup Usage',
    description:
      'The usage, reported in nanoseconds, of the Cgroup. Compare this with the throttling to discover issues.',
    type: 'node',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: 'ns'
  }),
  ...(() => {
    // CGroup CPU Utilization Fields
    const quotaMetricConfig = {
      app: 'elasticsearch',
      uuidField: 'source_node.uuid',
      timestampField: 'timestamp',
      fieldSource: 'node_stats.os.cgroup',
      usageField: 'cpuacct.usage_nanos',
      periodsField: 'cpu.stat.number_of_elapsed_periods',
      quotaField: 'cpu.cfs_quota_micros',
      field: 'node_stats.process.cpu.percent', // backup field if quota is not configured
      label: 'Cgroup CPU Utilization',
      description:
        'CPU Usage time compared to the CPU quota shown in percentage. If CPU ' +
        'quotas are not set, then no data will be shown.',
      type: 'node'
    };
    return {
      node_cgroup_quota: new QuotaMetric({
        ...quotaMetricConfig,
        title: 'CPU Utilization'
      }),
      node_cgroup_quota_as_cpu_utilization: new QuotaMetric({
        ...quotaMetricConfig,
        label: 'CPU Utilization' //  override the "Cgroup CPU..." label
      })
    };
  })(),
  node_cpu_utilization: new ElasticsearchMetric({
    field: 'node_stats.process.cpu.percent',
    label: 'CPU Utilization',
    description: 'Percentage of CPU usage for the Elasticsearch process.',
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '%'
  }),
  node_segment_count: new ElasticsearchMetric({
    field: 'node_stats.indices.segments.count',
    label: 'Segment Count',
    description:
      'Maximum segment count for primary and replica shards on this node.',
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  node_jvm_gc_old_count: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.old.collection_count',
    title: 'GC Count',
    label: 'Old',
    description: 'Number of old Garbage Collections.',
    derivative: true,
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
    type: 'node'
  }),
  node_jvm_gc_old_time: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.old.collection_time_in_millis',
    title: 'GC Duration',
    label: 'Old',
    derivative: true,
    description: 'Time spent performing old Garbage Collections.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms',
    type: 'node'
  }),
  node_jvm_gc_young_count: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.young.collection_count',
    title: 'GC Count',
    label: 'Young',
    description: 'Number of young Garbage Collections.',
    derivative: true,
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
    type: 'node'
  }),
  node_jvm_gc_young_time: new ElasticsearchMetric({
    field: 'node_stats.jvm.gc.collectors.young.collection_time_in_millis',
    title: 'GC Duration',
    label: 'Young',
    description: 'Time spent performing young Garbage Collections.',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms',
    type: 'node'
  }),
  node_jvm_mem_max_in_bytes: new ElasticsearchMetric({
    field: 'node_stats.jvm.mem.heap_max_in_bytes',
    title: 'JVM Heap',
    label: 'Max Heap',
    description: 'Total heap available to Elasticsearch running in the JVM.',
    type: 'node',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  node_jvm_mem_used_in_bytes: new ElasticsearchMetric({
    field: 'node_stats.jvm.mem.heap_used_in_bytes',
    title: 'JVM Heap',
    label: 'Used Heap',
    description: 'Total heap used by Elasticsearch running in the JVM.',
    type: 'node',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  node_jvm_mem_percent: new ElasticsearchMetric({
    field: 'node_stats.jvm.mem.heap_used_percent',
    title: 'JVM Heap',
    label: 'Used Heap',
    description: 'Total heap used by Elasticsearch running in the JVM.',
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '%'
  }),
  node_load_average: new ElasticsearchMetric({
    field: 'node_stats.os.cpu.load_average.1m',
    title: 'System Load',
    label: '1m',
    description: 'Load average over the last minute.',
    type: 'node',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  node_index_mem_overall: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: 'Lucene Total',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.' // eslint-disable-line max-len
  }),
  node_index_mem_overall_1: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: 'Lucene Total',
    title: 'Index Memory - Lucene 1',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.' // eslint-disable-line max-len
  }),
  node_index_mem_overall_2: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: 'Lucene Total',
    title: 'Index Memory - Lucene 2',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.' // eslint-disable-line max-len
  }),
  node_index_mem_overall_3: new NodeIndexMemoryMetric({
    field: 'memory_in_bytes',
    label: 'Lucene Total',
    title: 'Index Memory - Lucene 3',
    description:
      'Total heap memory used by Lucene for current index. This is the sum of other fields for primary and replica shards on this node.' // eslint-disable-line max-len
  }),
  node_index_mem_doc_values: new NodeIndexMemoryMetric({
    field: 'doc_values_memory_in_bytes',
    label: 'Doc Values',
    description:
      'Heap memory used by Doc Values. This is a part of Lucene Total.'
  }),
  // Note: This is not segment memory, unlike the rest of the SingleIndexMemoryMetrics
  node_index_mem_fielddata: new IndexMemoryMetric({
    field: 'node_stats.indices.fielddata.memory_size_in_bytes',
    label: 'Fielddata',
    description:
      'Heap memory used by Fielddata (e.g., global ordinals or explicitly enabled fielddata on text fields). This is for the same shards, but not a part of Lucene Total.', // eslint-disable-line max-len
    type: 'node'
  }),
  node_index_mem_fixed_bit_set: new NodeIndexMemoryMetric({
    field: 'fixed_bit_set_memory_in_bytes',
    label: 'Fixed Bitsets',
    description:
      'Heap memory used by Fixed Bit Sets (e.g., deeply nested documents). This is a part of Lucene Total.'
  }),
  node_index_mem_norms: new NodeIndexMemoryMetric({
    field: 'norms_memory_in_bytes',
    label: 'Norms',
    description:
      'Heap memory used by Norms (normalization factors for query-time, text scoring). This is a part of Lucene Total.'
  }),
  node_index_mem_points: new NodeIndexMemoryMetric({
    field: 'points_memory_in_bytes',
    label: 'Points',
    description:
      'Heap memory used by Points (e.g., numbers, IPs, and geo data). This is a part of Lucene Total.'
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  node_index_mem_query_cache: new IndexMemoryMetric({
    field: 'node_stats.indices.query_cache.memory_size_in_bytes',
    label: 'Query Cache',
    title: 'Index Memory - Elasticsearch',
    description:
      'Heap memory used by Query Cache (e.g., cached filters). This is for the same shards, but not a part of Lucene Total.',
    type: 'node'
  }),
  // Note: This is not segment memory, unlike SingleIndexMemoryMetrics
  node_index_mem_request_cache: new IndexMemoryMetric({
    field: 'node_stats.indices.request_cache.memory_size_in_bytes',
    label: 'Request Cache',
    description:
      'Heap memory used by Request Cache (e.g., instant aggregations). This is for the same shards, but not a part of Lucene Total.', // eslint-disable-line max-len
    type: 'node'
  }),
  node_index_mem_stored_fields: new NodeIndexMemoryMetric({
    field: 'stored_fields_memory_in_bytes',
    label: 'Stored Fields',
    description:
      'Heap memory used by Stored Fields (e.g., _source). This is a part of Lucene Total.'
  }),
  node_index_mem_term_vectors: new NodeIndexMemoryMetric({
    field: 'term_vectors_memory_in_bytes',
    label: 'Term Vectors',
    description:
      'Heap memory used by Term Vectors. This is a part of Lucene Total.'
  }),
  node_index_mem_terms: new NodeIndexMemoryMetric({
    field: 'terms_memory_in_bytes',
    label: 'Terms',
    description:
      'Heap memory used by Terms (e.g., text). This is a part of Lucene Total.'
  }),
  node_index_mem_versions: new NodeIndexMemoryMetric({
    field: 'version_map_memory_in_bytes',
    label: 'Version Map',
    description:
      'Heap memory used by Versioning (e.g., updates and deletes). This is NOT a part of Lucene Total.'
  }),
  node_index_mem_writer: new NodeIndexMemoryMetric({
    field: 'index_writer_memory_in_bytes',
    label: 'Index Writer',
    description:
      'Heap memory used by the Index Writer. This is NOT a part of Lucene Total.'
  }),
  node_index_threads_get_queue: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.get.queue',
    title: 'Read Threads',
    label: 'GET Queue',
    description: 'Number of GET operations in the queue.',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0
  }),
  node_index_threads_get_rejected: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.get.rejected',
    title: 'Read Threads',
    label: 'GET Rejections',
    description:
      'Number of GET operations that have been rejected, which occurs when the queue is full.',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0
  }),
  node_index_threads_write_queue: new WriteThreadPoolQueueMetric({
    title: 'Indexing Threads',
    label: 'Write Queue',
    description: (
      'Number of index, bulk, and write operations in the queue. ' +
      'The bulk threadpool was renamed to write in 6.3, and the index threadpool is deprecated.'
    ),
  }),
  node_index_threads_write_rejected: new WriteThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.bulk.rejected',
    title: 'Indexing Threads',
    label: 'Write Rejections',
    description: (
      'Number of index, bulk, and write operations that have been rejected, which occurs when the queue is full. ' +
      'The bulk threadpool was renamed to write in 6.3, and the index threadpool is deprecated.'
    ),
  }),
  node_index_threads_search_queue: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.search.queue',
    title: 'Read Threads',
    label: 'Search Queue',
    description:
      'Number of search operations in the queue (e.g., shard level searches).',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0
  }),
  node_index_threads_search_rejected: new ElasticsearchMetric({
    field: 'node_stats.thread_pool.search.rejected',
    title: 'Read Threads',
    label: 'Search Rejections',
    description:
      'Number of search operations that have been rejected, which occurs when the queue is full.',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    min: 0
  }),
  node_index_total: new ElasticsearchMetric({
    field: 'node_stats.indices.indexing.index_total',
    title: 'Request Rate',
    label: 'Indexing Total',
    description: 'Amount of indexing operations.',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  node_index_time: new ElasticsearchMetric({
    field: 'node_stats.indices.indexing.index_time_in_millis',
    title: 'Indexing Time',
    label: 'Index Time',
    description: 'Amount of time spent on indexing operations.',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  node_free_space: new ElasticsearchMetric({
    field: 'node_stats.fs.total.available_in_bytes',
    label: 'Disk Free Space',
    description: 'Free disk space available on the node.',
    type: 'node',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: ''
  }),
  node_search_total: new ElasticsearchMetric({
    field: 'node_stats.indices.search.query_total',
    title: 'Request Rate',
    label: 'Search Total',
    description: 'Amount of search operations (per shard).',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  node_threads_queued_bulk: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.bulk.queue',
    label: 'Bulk',
    description:
      'Number of bulk indexing operations waiting to be processed on this node. A single bulk request can create multiple bulk operations.' // eslint-disable-line max-len
  }),
  node_threads_queued_generic: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.generic.queue',
    label: 'Generic',
    description:
      'Number of generic (internal) operations waiting to be processed on this node.'
  }),
  node_threads_queued_get: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.get.queue',
    title: 'Thread Queue',
    label: 'Get',
    description:
      'Number of get operations waiting to be processed on this node.'
  }),
  node_threads_queued_index: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.index.queue',
    label: 'Index',
    description:
      'Number of non-bulk, index operations waiting to be processed on this node.'
  }),
  node_threads_queued_management: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.management.queue',
    label: 'Management',
    description:
      'Number of management (internal) operations waiting to be processed on this node.'
  }),
  node_threads_queued_search: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.search.queue',
    label: 'Search',
    description:
      'Number of search operations waiting to be processed on this node. A single search request can create multiple search operations.' // eslint-disable-line max-len
  }),
  node_threads_queued_watcher: new ThreadPoolQueueMetric({
    field: 'node_stats.thread_pool.watcher.queue',
    label: 'Watcher',
    description:
      'Number of Watcher operations waiting to be processed on this node.'
  }),
  node_threads_rejected_bulk: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.bulk.rejected',
    label: 'Bulk',
    description: 'Bulk rejections. These occur when the queue is full.'
  }),
  node_threads_rejected_generic: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.generic.rejected',
    label: 'Generic',
    description:
      'Generic (internal) rejections. These occur when the queue is full.'
  }),
  node_threads_rejected_get: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.get.rejected',
    label: 'Get',
    description: 'Get rejections. These occur when the queue is full.'
  }),
  node_threads_rejected_index: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.index.rejected',
    label: 'Index',
    description:
      'Index rejections. These occur when the queue is full. You should look at bulk indexing.'
  }),
  node_threads_rejected_management: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.management.rejected',
    label: 'Management',
    description:
      'Get (internal) rejections. These occur when the queue is full.'
  }),
  node_threads_rejected_search: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.search.rejected',
    label: 'Search',
    description:
      'Search rejections. These occur when the queue is full. This can indicate over-sharding.'
  }),
  node_threads_rejected_watcher: new ThreadPoolRejectedMetric({
    field: 'node_stats.thread_pool.watcher.rejected',
    label: 'Watcher',
    description:
      'Watch rejections. These occur when the queue is full. This can indicate stuck-Watches.'
  }),
  node_throttle_index_time: new ElasticsearchMetric({
    field: 'node_stats.indices.indexing.throttle_time_in_millis',
    title: 'Indexing Time',
    label: 'Index Throttling Time',
    description:
      'Amount of time spent with index throttling, which indicates slow disks on a node.',
    type: 'node',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms',
    min: 0
  }),
  index_throttle_time: new ElasticsearchMetric({
    field: 'index_stats.primaries.indexing.throttle_time_in_millis',
    label: 'Index Throttling Time',
    description:
      'Amount of time spent with index throttling, which indicates slow merging.',
    type: 'index',
    derivative: true,
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  index_document_count: new ElasticsearchMetric({
    field: 'index_stats.primaries.docs.count',
    label: 'Document Count',
    description: 'Total number of documents, only including primary shards.',
    type: 'index',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    units: ''
  }),
  index_search_request_rate: new RequestRateMetric({
    field: 'index_stats.total.search.query_total',
    title: 'Search Rate',
    label: 'Total Shards',
    description:
      'Number of search requests being executed across primary and replica shards. A single search can run against multiple shards!', // eslint-disable-line max-len
    type: 'index'
  }),
  index_merge_rate: new RequestRateMetric({
    field: 'index_stats.total.merges.total_size_in_bytes',
    label: 'Merge Rate',
    description:
      'Amount in bytes of merged segments. Larger numbers indicate heavier disk activity.',
    type: 'index'
  }),
  index_refresh_time: new ElasticsearchMetric({
    field: 'total.refresh.total_time_in_millis',
    label: 'Total Refresh Time',
    description:
      'Time spent on Elasticsearch refresh for primary and replica shards.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
    type: 'index',
    derivative: true
  }),

  // CCR
  ccr_sync_lag_time: new MillisecondsToSecondsMetric({
    title: 'Fetch delay', // title to use for the chart
    type: 'ccr',
    field: 'ccr_stats.time_since_last_fetch_millis',
    label: 'Fetch delay',
    description: 'The amount of time the follower index is lagging behind the leader.',
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: 'ms'
  }),
  ccr_sync_lag_ops: new DifferenceMetric({
    title: 'Ops delay', // title to use for the chart
    type: 'ccr',
    fieldSource: 'ccr_stats',
    metric: 'leader_max_seq_no',
    metric2: 'follower_global_checkpoint',
    label: 'Ops delay',
    description: 'The number of operations the follower index is lagging behind the leader.',
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
};
