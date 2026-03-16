/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYState } from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { LensApiState } from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { PanelDefinition } from '../../../types';

export const cpuUsagePanel = (indexPattern: string): PanelDefinition => ({
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
