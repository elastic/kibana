/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { getHeapMemoryChart } from './heap_memory';
import { getNonHeapMemoryChart } from './non_heap_memory';
import { getThreadCountChart } from './thread_count';
import { getCPUChartData } from '../shared/cpu';
import { getMemoryChartData } from '../shared/memory';
import { getOTelSystemCPUChartDataForJava } from './otel_cpu';
import { getGcRateChart } from './gc/get_gc_rate_chart';
import { getGcTimeChart } from './gc/get_gc_time_chart';
import { APMConfig } from '../../../..';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export function getJavaMetricsCharts({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  start,
  end,
  isOpenTelemetry,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
  isOpenTelemetry: boolean;
}) {
  return withApmSpan('get_java_system_metric_charts', () => {
    const options = {
      environment,
      kuery,
      config,
      apmEventClient,
      serviceName,
      serviceNodeName,
      start,
      end,
      isOpenTelemetry,
    };

    return Promise.all([
      isOpenTelemetry ? getOTelSystemCPUChartDataForJava(options) : getCPUChartData(options),
      getMemoryChartData(options),
      getHeapMemoryChart(options),
      getNonHeapMemoryChart(options),
      getThreadCountChart(options),
      getGcRateChart(options),
      getGcTimeChart(options),
    ]);
  });
}
