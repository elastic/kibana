/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { getHeapMemoryChart } from './heap_memory';
import { Setup } from '../../../../lib/helpers/setup_request';
import { getNonHeapMemoryChart } from './non_heap_memory';
import { getThreadCountChart } from './thread_count';
import { getCPUChartData } from '../shared/cpu';
import { getMemoryChartData } from '../shared/memory';
import { getGcRateChart } from './gc/get_gc_rate_chart';
import { getGcTimeChart } from './gc/get_gc_time_chart';

export function getJavaMetricsCharts({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
}) {
  return withApmSpan('get_java_system_metric_charts', () => {
    const options = {
      environment,
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      start,
      end,
    };

    return Promise.all([
      getCPUChartData(options),
      getMemoryChartData(options),
      getHeapMemoryChart(options),
      getNonHeapMemoryChart(options),
      getThreadCountChart(options),
      getGcRateChart(options),
      getGcTimeChart(options),
    ]);
  });
}
