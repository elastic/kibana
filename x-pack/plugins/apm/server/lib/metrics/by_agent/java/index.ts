/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHeapMemoryChart } from './heap_memory';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';
import { getNonHeapMemoryChart } from './non_heap_memory';
import { getThreadCountChart } from './thread_count';
import { getCPUChartData } from '../shared/cpu';
import { getMemoryChartData } from '../shared/memory';
import { getGcRateChart } from './gc/get_gc_rate_chart';
import { getGcTimeChart } from './gc/get_gc_time_chart';

export async function getJavaMetricsCharts({
  setup,
  serviceName,
  serviceNodeName,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  const charts = await Promise.all([
    getCPUChartData({ setup, serviceName, serviceNodeName }),
    getMemoryChartData({ setup, serviceName, serviceNodeName }),
    getHeapMemoryChart({ setup, serviceName, serviceNodeName }),
    getNonHeapMemoryChart({ setup, serviceName, serviceNodeName }),
    getThreadCountChart({ setup, serviceName, serviceNodeName }),
    getGcRateChart({ setup, serviceName, serviceNodeName }),
    getGcTimeChart({ setup, serviceName, serviceNodeName }),
  ]);

  return { charts };
}
