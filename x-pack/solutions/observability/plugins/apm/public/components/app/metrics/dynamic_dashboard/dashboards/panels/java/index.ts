/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelSlot } from '../../../types';

const ESQL_LAYER_DEFAULTS = {
  ignore_global_filters: false,
  sampling: 1,
} as const;

const cpuUsagePanel = (indexPattern: string): PanelSlot => ({
  id: 'cpu-usage',
  title: 'CPU Usage',
  gridConfig: { x: 0, y: 0, w: 24, h: 15 },
  variants: [
    {
      id: 'semconv',
      requiredFields: ['jvm.cpu.recent_utilization'],
      config: {
        type: 'xy',
        title: 'CPU Usage',
        layers: [
          {
            ...ESQL_LAYER_DEFAULTS,
            type: 'line',
            dataset: {
              type: 'esql' as const,
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
            y: [
              { operation: 'value' as const, column: 'Process avg' },
              { operation: 'value' as const, column: 'Process max' },
            ],
            x: { operation: 'value' as const, column: '@timestamp' },
          },
        ],
      },
    },
  ],
});

const memoryUsagePanel = (indexPattern: string): PanelSlot => ({
  id: 'memory-usage',
  title: 'Memory Usage',
  gridConfig: { x: 24, y: 0, w: 24, h: 15 },
  variants: [
    {
      id: 'semconv',
      requiredFields: ['jvm.memory.used', 'jvm.memory.type'],
      config: {
        type: 'xy',
        title: 'Memory Usage',
        layers: [
          {
            ...ESQL_LAYER_DEFAULTS,
            type: 'area',
            dataset: {
              type: 'esql' as const,
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
            y: [
              { operation: 'value' as const, column: 'Heap' },
              { operation: 'value' as const, column: 'Non Heap' },
            ],
            x: { operation: 'value' as const, column: '@timestamp' },
            breakdown_by: { operation: 'value' as const, column: 'jvm.memory.pool.name' },
          },
        ],
      },
    },
  ],
});

const threadCountPanel = (indexPattern: string): PanelSlot => ({
  id: 'thread-count',
  title: 'Thread Count',
  gridConfig: { x: 0, y: 15, w: 24, h: 15 },
  variants: [
    {
      id: 'semconv',
      requiredFields: ['jvm.thread.count'],
      config: {
        type: 'xy',
        title: 'Thread Count',
        layers: [
          {
            ...ESQL_LAYER_DEFAULTS,
            type: 'area',
            dataset: {
              type: 'esql' as const,
              query: `FROM ${indexPattern}
  | WHERE jvm.thread.count IS NOT NULL
  | STATS thread_count = AVG(jvm.thread.count)
          BY service.instance.id, jvm.thread.state, jvm.thread.daemon, @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)
  | STATS thread_count = SUM(thread_count) BY service.instance.id, jvm.thread.state, @timestamp
  | STATS thread_count = AVG(thread_count) BY jvm.thread.state, @timestamp
  | RENAME thread_count AS \`Thread Count\``,
            },
            y: [{ operation: 'value' as const, column: 'Thread Count' }],
            x: { operation: 'value' as const, column: '@timestamp' },
            breakdown_by: { operation: 'value' as const, column: 'jvm.thread.state' },
          },
        ],
      },
    },
  ],
});

const memoryUsageRelativePanel = (indexPattern: string): PanelSlot => ({
  id: 'memory-usage-relative',
  title: 'Memory Usage (% of limit)',
  gridConfig: { x: 24, y: 15, w: 24, h: 15 },
  variants: [
    {
      id: 'semconv',
      requiredFields: ['jvm.memory.used', 'jvm.memory.limit', 'jvm.memory.type'],
      config: {
        type: 'xy',
        title: 'Memory Usage (% of limit)',
        layers: [
          {
            ...ESQL_LAYER_DEFAULTS,
            type: 'area',
            dataset: {
              type: 'esql' as const,
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
            y: [
              { operation: 'value' as const, column: 'Heap' },
              { operation: 'value' as const, column: 'Non Heap' },
            ],
            x: { operation: 'value' as const, column: '@timestamp' },
            breakdown_by: { operation: 'value' as const, column: 'jvm.memory.pool.name' },
          },
        ],
      },
    },
  ],
});

export const getJavaPanels = (indexPattern: string): PanelSlot[] => [
  cpuUsagePanel(indexPattern),
  memoryUsagePanel(indexPattern),
  threadCountPanel(indexPattern),
  memoryUsageRelativePanel(indexPattern),
];
