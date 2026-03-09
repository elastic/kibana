/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiState } from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { XYState, DatatableStateESQL } from '@kbn/lens-embeddable-utils/config_builder/schema';

export interface PanelDefinition {
  id: string;
  title: string;
  config: LensApiState;
  gridConfig: { x: number; y: number; w: number; h: number };
  requiredMetrics?: string[];
}

const CPU_HEAP_COLOR_STEPS = [
  { color: '#209280', lt: 0.5 },
  { color: '#54b399', gte: 0.5, lt: 0.7 },
  { color: '#d6bf57', gte: 0.7, lt: 0.8 },
  { color: '#e7664c', gte: 0.8, lt: 0.9 },
  { color: '#cc5642', gte: 0.9, lte: 1.9 },
] as const;

const jvmOverviewTable = (indexPattern: string): PanelDefinition => ({
  id: 'jvm-overview',
  title: 'JVM overview',
  requiredMetrics: ['jvm.cpu.recent_utilization'],
  gridConfig: { x: 0, y: 0, w: 48, h: 13 },
  config: {
    type: 'datatable',
    title: 'JVM overview',
    dataset: {
      type: 'esql',
      query: `FROM ${indexPattern}
  | WHERE jvm.cpu.recent_utilization IS NOT NULL OR jvm.memory.used::long IS NOT NULL OR jvm.memory.limit IS NOT NULL OR jvm.thread.count IS NOT NULL
  | EVAL heap_used = CASE(jvm.memory.type == "heap", jvm.memory.used::long, NULL),
         off_heap_used = CASE(jvm.memory.type == "non_heap", jvm.memory.used::long, NULL),
         heap_limit = CASE(jvm.memory.type == "heap", jvm.memory.limit, NULL)
  | STATS cpu = AVG(jvm.cpu.recent_utilization),
          heap_used = AVG(heap_used),
          off_heap_used = AVG(off_heap_used),
          heap_limit = AVG(heap_limit),
          max_threads = MAX(jvm.thread.count)
          BY service.instance.id, host.name, jvm.memory.pool.name, jvm.thread.daemon, jvm.thread.state, time_bucket = BUCKET(@timestamp, 1 minute)
  | STATS cpu = AVG(cpu),
          heap_used = AVG(heap_used),
          off_heap_used = AVG(off_heap_used),
          heap_limit = AVG(heap_limit),
          max_threads = SUM(max_threads)
          BY service.instance.id, host.name, jvm.memory.pool.name, time_bucket
  | STATS cpu = AVG(cpu), heap_used = SUM(heap_used), off_heap_used = SUM(off_heap_used), heap_limit = SUM(heap_limit), max_threads = MAX(max_threads) by service.instance.id, host.name, time_bucket
  | EVAL heap_usage_perc = heap_used/heap_limit
  | STATS cpu = AVG(cpu), heap_usage_perc = AVG(heap_usage_perc), heap_used = AVG(heap_used), off_heap_used = AVG(off_heap_used), max_threads = MAX(max_threads), last_seen = MAX(time_bucket) by service.instance.id, host.name
  | SORT last_seen DESC
  | LIMIT 100`,
    },
    sampling: 1,
    ignore_global_filters: false,
    metrics: [
      {
        operation: 'value',
        column: 'cpu',
        label: 'CPU avg',
        format: { type: 'percent', decimals: 2, compact: false },
        apply_color_to: 'value',
        color: {
          type: 'dynamic',
          range: 'absolute',
          steps: [...CPU_HEAP_COLOR_STEPS],
        },
        width: 54,
      },
      {
        operation: 'value',
        column: 'heap_usage_perc',
        label: 'Heap Usage Avg',
        format: { type: 'percent', decimals: 2, compact: false },
        apply_color_to: 'value',
        color: {
          type: 'dynamic',
          range: 'absolute',
          steps: [...CPU_HEAP_COLOR_STEPS],
        },
      },
      {
        operation: 'value',
        column: 'heap_used',
        label: 'Heap avg',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'off_heap_used',
        label: 'Non-heap avg',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'max_threads',
        label: 'Thread count max',
      },
      {
        operation: 'value',
        column: 'last_seen',
        label: 'Last Seen',
      },
    ],
    rows: [
      { operation: 'value', column: 'service.instance.id', width: 337 },
      { operation: 'value', column: 'host.name' },
    ],
  } satisfies DatatableStateESQL as LensApiState,
});

const cpuUsagePanel = (indexPattern: string): PanelDefinition => ({
  id: 'cpu-usage',
  title: 'CPU Usage',
  requiredMetrics: ['jvm.cpu.recent_utilization'],
  gridConfig: { x: 0, y: 13, w: 24, h: 15 },
  config: {
    type: 'xy',
    title: 'CPU Usage',
    legend: { visibility: 'visible', position: 'bottom' },
    fitting: { type: 'linear' },
    axis: {
      left: { extent: { type: 'custom', start: 0, end: 1 } },
    },
    layers: [
      {
        type: 'line',
        dataset: {
          type: 'esql',
          query: `FROM ${indexPattern}
  | STATS process_cpu_avg = AVG(jvm.cpu.recent_utilization),
          process_cpu_max = MAX(jvm.cpu.recent_utilization)
          BY service.instance.id, @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
  | STATS process_cpu_avg = AVG(process_cpu_avg),
          process_cpu_max = AVG(process_cpu_max)
          BY @timestamp
  | RENAME process_cpu_avg AS \`Process avg\`,
           process_cpu_max AS \`Process max\``,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: { operation: 'value', column: '@timestamp' },
        y: [
          { operation: 'value', column: 'Process avg' },
          { operation: 'value', column: 'Process max' },
        ],
      },
    ],
  } satisfies XYState as LensApiState,
});

const absoluteMemoryUsagePanel = (indexPattern: string): PanelDefinition => ({
  id: 'absolute-memory-usage',
  title: 'Absolute Memory Usage',
  requiredMetrics: ['jvm.memory.used'],
  gridConfig: { x: 24, y: 13, w: 24, h: 15 },
  config: {
    type: 'xy',
    title: 'Absolute Memory Usage',
    legend: { visibility: 'hidden' },
    layers: [
      {
        type: 'area_stacked',
        dataset: {
          type: 'esql',
          query: `FROM ${indexPattern}
  | WHERE jvm.memory.used::long IS NOT NULL OR jvm.memory.limit IS NOT NULL
  | EVAL heap_used = CASE(jvm.memory.type == "heap", jvm.memory.used::long, NULL),
         off_heap_used = CASE(jvm.memory.type == "non_heap", jvm.memory.used::long, NULL)
  | STATS heap_used = AVG(heap_used),
          off_heap_used = AVG(off_heap_used)
          BY service.instance.id, jvm.memory.pool.name, @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
  | STATS off_heap_used = AVG(off_heap_used),
          heap_used = AVG(heap_used)
          BY jvm.memory.pool.name, @timestamp
  | RENAME off_heap_used AS \`Non Heap\`, heap_used AS \`Heap\``,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: { operation: 'value', column: '@timestamp' },
        breakdown_by: { operation: 'value', column: 'jvm.memory.pool.name' },
        y: [
          { operation: 'value', column: 'Non Heap' },
          { operation: 'value', column: 'Heap' },
        ],
      },
    ],
  } satisfies XYState as LensApiState,
});

const threadCountPanel = (indexPattern: string): PanelDefinition => ({
  id: 'thread-count',
  title: 'Thread Count',
  requiredMetrics: ['jvm.thread.count'],
  gridConfig: { x: 0, y: 28, w: 24, h: 15 },
  config: {
    type: 'xy',
    title: 'Thread Count',
    legend: { visibility: 'hidden' },
    axis: {
      left: { title: { value: 'Number of Threads', visible: true } },
    },
    layers: [
      {
        type: 'area_stacked',
        dataset: {
          type: 'esql',
          query: `FROM ${indexPattern}
  | WHERE jvm.thread.count IS NOT NULL
  | STATS thread_count = AVG(jvm.thread.count)
          BY service.instance.id, jvm.thread.state, jvm.thread.daemon, @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
  | STATS thread_count = SUM(thread_count) BY service.instance.id, jvm.thread.state, @timestamp
  | STATS thread_count = AVG(thread_count) BY jvm.thread.state, @timestamp
  | RENAME thread_count AS \`Thread Count\``,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: { operation: 'value', column: '@timestamp' },
        breakdown_by: { operation: 'value', column: 'jvm.thread.state' },
        y: [{ operation: 'value', column: 'Thread Count' }],
      },
    ],
  } satisfies XYState as LensApiState,
});

const relativeMemoryUsagePanel = (indexPattern: string): PanelDefinition => ({
  id: 'relative-memory-usage',
  title: 'Relative Memory Usage',
  requiredMetrics: ['jvm.memory.used'],
  gridConfig: { x: 24, y: 28, w: 24, h: 15 },
  config: {
    type: 'xy',
    title: 'Relative Memory Usage',
    legend: { visibility: 'hidden' },
    fitting: { type: 'linear' },
    axis: {
      left: { extent: { type: 'custom', start: 0, end: 1 } },
    },
    layers: [
      {
        type: 'line',
        dataset: {
          type: 'esql',
          query: `FROM ${indexPattern}
  | WHERE jvm.memory.used::long IS NOT NULL OR jvm.memory.limit IS NOT NULL
  | EVAL heap_used = CASE(jvm.memory.type == "heap", jvm.memory.used::long, NULL),
         off_heap_used = CASE(jvm.memory.type == "non_heap", jvm.memory.used::long, NULL),
         heap_limit = CASE(jvm.memory.type == "heap", jvm.memory.limit, NULL),
         off_heap_limit = CASE(jvm.memory.type == "non_heap", jvm.memory.limit, NULL)
  | STATS heap_used = AVG(heap_used),
          off_heap_used = AVG(off_heap_used),
          heap_limit = AVG(heap_limit),
          off_heap_limit = AVG(off_heap_limit)
          BY service.instance.id, jvm.memory.pool.name, @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
  | STATS off_heap_used_rel = AVG(off_heap_used / off_heap_limit),
          heap_used_rel = AVG(heap_used / heap_limit)
          BY jvm.memory.pool.name, @timestamp
  | RENAME off_heap_used_rel AS \`Non Heap\`, heap_used_rel AS \`Heap\``,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: { operation: 'value', column: '@timestamp' },
        breakdown_by: { operation: 'value', column: 'jvm.memory.pool.name' },
        y: [
          { operation: 'value', column: 'Non Heap' },
          { operation: 'value', column: 'Heap' },
        ],
      },
    ],
  } satisfies XYState as LensApiState,
});

const heapMemoryRegionStatsTable = (indexPattern: string): PanelDefinition => ({
  id: 'heap-memory-region-stats',
  title: 'Heap Memory Region Statistics',
  requiredMetrics: ['jvm.memory.used'],
  gridConfig: { x: 0, y: 43, w: 24, h: 12 },
  config: {
    type: 'datatable',
    title: 'Heap Memory Region Statistics',
    dataset: {
      type: 'esql',
      query: `FROM ${indexPattern}
  | WHERE jvm.memory.type == "heap"
  | STATS mem_used_avg = AVG(jvm.memory.used::long),
          mem_comitted_avg = AVG(jvm.memory.committed::long),
          mem_comitted_max = MAX(jvm.memory.committed::long),
          mem_limit_avg = AVG(jvm.memory.limit),
          mem_used_aftergc_max = MAX(jvm.memory.used_after_last_gc)
          BY service.instance.id, jvm.memory.pool.name, @timestamp = BUCKET(@timestamp, 1 minute)
  | STATS mem_limit_avg = AVG(mem_limit_avg),
          mem_used_avg = AVG(mem_used_avg),
          mem_used_avg_rel = MAX(mem_used_avg/mem_limit_avg),
          mem_used_aftergc_max = MAX(mem_used_aftergc_max),
          mem_used_aftergc_max_rel = MAX(mem_used_aftergc_max/mem_limit_avg),
          mem_comitted_avg = AVG(mem_comitted_avg),
          mem_comitted_max = MAX(mem_comitted_max)
          BY jvm.memory.pool.name`,
    },
    sampling: 1,
    ignore_global_filters: false,
    metrics: [
      {
        operation: 'value',
        column: 'mem_limit_avg',
        label: 'Limit',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'mem_used_avg',
        label: 'Used avg',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'mem_used_avg_rel',
        label: 'Used avg [%]',
        format: { type: 'percent', decimals: 2, compact: false },
      },
      {
        operation: 'value',
        column: 'mem_used_aftergc_max',
        label: 'Max used after GC',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'mem_used_aftergc_max_rel',
        label: 'Max used after GC [%]',
        format: { type: 'percent', decimals: 2, compact: false },
      },
      {
        operation: 'value',
        column: 'mem_comitted_avg',
        label: 'Committed avg',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'mem_comitted_max',
        label: 'Committed max',
        format: { type: 'bytes', decimals: 2 },
      },
    ],
    rows: [{ operation: 'value', column: 'jvm.memory.pool.name' }],
  } satisfies DatatableStateESQL as LensApiState,
});

const nonHeapMemoryRegionStatsTable = (indexPattern: string): PanelDefinition => ({
  id: 'non-heap-memory-region-stats',
  title: 'Non-Heap Memory Region Statistics',
  requiredMetrics: ['jvm.memory.used'],
  gridConfig: { x: 24, y: 43, w: 24, h: 12 },
  config: {
    type: 'datatable',
    title: 'Non-Heap Memory Region Statistics',
    dataset: {
      type: 'esql',
      query: `FROM ${indexPattern}
  | WHERE jvm.memory.type == "non_heap"
  | STATS mem_used_avg = AVG(jvm.memory.used::long),
          mem_used_max = MAX(jvm.memory.used::long),
          mem_comitted_avg = AVG(jvm.memory.committed::long),
          mem_comitted_max = MAX(jvm.memory.committed::long),
          mem_limit_avg = AVG(jvm.memory.limit)
          BY service.instance.id, jvm.memory.pool.name, @timestamp = BUCKET(@timestamp, 1 minute)
  | STATS mem_limit_avg = AVG(mem_limit_avg),
          mem_used_avg = AVG(mem_used_avg),
          mem_used_avg_rel = MAX(mem_used_avg/mem_limit_avg),
          mem_used_max = MAX(mem_used_max),
          mem_used_max_rel = MAX(mem_used_max/mem_limit_avg),
          mem_comitted_avg = AVG(mem_comitted_avg),
          mem_comitted_max = MAX(mem_comitted_max)
          BY jvm.memory.pool.name`,
    },
    sampling: 1,
    ignore_global_filters: false,
    metrics: [
      {
        operation: 'value',
        column: 'mem_limit_avg',
        label: 'Limit',
        format: { type: 'bytes', decimals: 2 },
        width: 85,
      },
      {
        operation: 'value',
        column: 'mem_used_avg',
        label: 'Used avg',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'mem_used_avg_rel',
        label: 'Used avg [%]',
        format: { type: 'percent', decimals: 2, compact: false },
      },
      {
        operation: 'value',
        column: 'mem_used_max',
        label: 'Used max',
        format: { type: 'bytes', decimals: 2 },
        width: 94,
      },
      {
        operation: 'value',
        column: 'mem_used_max_rel',
        label: 'Used max [%]',
        format: { type: 'percent', decimals: 2, compact: false },
        width: 73,
      },
      {
        operation: 'value',
        column: 'mem_comitted_avg',
        label: 'Committed avg',
        format: { type: 'bytes', decimals: 2 },
      },
      {
        operation: 'value',
        column: 'mem_comitted_max',
        label: 'Committed max',
        format: { type: 'bytes', decimals: 2 },
      },
    ],
    rows: [{ operation: 'value', column: 'jvm.memory.pool.name', width: 182 }],
  } satisfies DatatableStateESQL as LensApiState,
});

const loadedClassesPanel = (indexPattern: string): PanelDefinition => ({
  id: 'loaded-classes',
  title: 'Loaded Classes',
  requiredMetrics: ['jvm.class.count'],
  gridConfig: { x: 0, y: 55, w: 48, h: 12 },
  config: {
    type: 'xy',
    title: 'Loaded Classes',
    legend: { visibility: 'visible', position: 'right' },
    layers: [
      {
        type: 'line',
        dataset: {
          type: 'esql',
          query: `FROM ${indexPattern}
  | STATS classes = AVG(jvm.class.count) BY service.instance.id, @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
  | STATS classes = AVG(classes) BY @timestamp
  | RENAME classes AS \`Loaded Classes\``,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: { operation: 'value', column: '@timestamp' },
        y: [{ operation: 'value', column: 'Loaded Classes' }],
      },
    ],
  } satisfies XYState as LensApiState,
});

export const getOtelOtherJavaPanels = (indexPattern: string): PanelDefinition[] => [
  jvmOverviewTable(indexPattern),
  cpuUsagePanel(indexPattern),
  absoluteMemoryUsagePanel(indexPattern),
  threadCountPanel(indexPattern),
  relativeMemoryUsagePanel(indexPattern),
  heapMemoryRegionStatsTable(indexPattern),
  nonHeapMemoryRegionStatsTable(indexPattern),
  loadedClassesPanel(indexPattern),
];
