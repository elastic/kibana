/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { getHeapMemoryChart } from './heap_memory';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';
import { getNonHeapMemoryChart } from './non_heap_memory';
import { getThreadCountChart } from './thread_count';
import { getCPUChartData } from '../shared/cpu';
import { getMemoryChartData } from '../shared/memory';
import { getGcRateChart } from './gc/get_gc_rate_chart';
import { getGcTimeChart } from './gc/get_gc_time_chart';

export function getJavaMetricsCharts({
  environment,
  setup,
  serviceName,
  serviceNodeName,
}: {
  environment?: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  return withApmSpan('get_java_system_metric_charts', async () => {
    const charts = await Promise.all([
      getCPUChartData({ environment, setup, serviceName, serviceNodeName }),
      getMemoryChartData({ environment, setup, serviceName, serviceNodeName }),
      getHeapMemoryChart({ environment, setup, serviceName, serviceNodeName }),
      getNonHeapMemoryChart({
        environment,
        setup,
        serviceName,
        serviceNodeName,
      }),
      getThreadCountChart({ environment, setup, serviceName, serviceNodeName }),
      getGcRateChart({ environment, setup, serviceName, serviceNodeName }),
      getGcTimeChart({ environment, setup, serviceName, serviceNodeName }),
    ]);

    return { charts };
  });
}
