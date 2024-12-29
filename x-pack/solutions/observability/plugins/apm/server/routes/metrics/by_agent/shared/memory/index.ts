/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { termQuery } from '@kbn/observability-plugin/server';
import { withApmSpan } from '../../../../../utils/with_apm_span';
import {
  FAAS_ID,
  METRIC_CGROUP_MEMORY_LIMIT_BYTES,
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION,
} from '../../../../../../common/es_fields/apm';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { ChartBase } from '../../../types';
import { APMConfig } from '../../../../..';
import { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';

const series = {
  memoryUsedMax: {
    title: i18n.translate('xpack.apm.chart.memorySeries.systemMaxLabel', {
      defaultMessage: 'Max',
    }),
  },
  memoryUsedAvg: {
    title: i18n.translate('xpack.apm.chart.memorySeries.systemAverageLabel', {
      defaultMessage: 'Average',
    }),
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.serviceDetails.metrics.memoryUsageChartTitle', {
    defaultMessage: 'System memory usage',
  }),
  key: 'memory_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series,
};

export const systemMemory = {
  filter: {
    bool: {
      filter: [
        { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
        { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      ],
    },
  },
  script: {
    lang: 'painless',
    source: `
    def freeMemory = (double)$('${METRIC_SYSTEM_FREE_MEMORY}', 0);
    def totalMemory = (double)$('${METRIC_SYSTEM_TOTAL_MEMORY}', -1);
    if (freeMemory >= 0 && totalMemory > 0) {
      return 1 - freeMemory / totalMemory;
    }
    return null;
  `,
  },
};

export const cgroupMemory = {
  filter: {
    bool: {
      filter: [{ exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES } }],
      should: [
        { exists: { field: METRIC_CGROUP_MEMORY_LIMIT_BYTES } },
        { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      ],
      minimum_should_match: 1,
    },
  },
  script: {
    lang: 'painless',
    source: `
    /*
      When no limit is specified in the container, docker allows the app as much memory / swap memory as it wants.
      This number represents the max possible value for the limit field.
    */
    double CGROUP_LIMIT_MAX_VALUE = 9223372036854771712L;

    //Should use cgroupLimit when value is not empty and not equals to the max limit value.
    double cgroupLimit = $('${METRIC_CGROUP_MEMORY_LIMIT_BYTES}', 0);
    double total = (double)((cgroupLimit != 0 && cgroupLimit != CGROUP_LIMIT_MAX_VALUE) ? cgroupLimit : $('${METRIC_SYSTEM_TOTAL_MEMORY}', 0));
    if (total <= 0) {
      return null;
    }

    double used = (double)$('${METRIC_CGROUP_MEMORY_USAGE_BYTES}', 0);
    return used / total;
    `,
  },
};

export async function getMemoryChartData({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  serverlessId,
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
  serverlessId?: string;
  start: number;
  end: number;
  isOpenTelemetry?: boolean;
}) {
  if (isOpenTelemetry) {
    return await fetchAndTransformMetrics({
      environment,
      kuery,
      config,
      apmEventClient,
      serviceName,
      serviceNodeName,
      start,
      end,
      chartBase,
      aggs: {
        memoryUsedAvg: {
          avg: { field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION },
        },
        memoryUsedMax: {
          max: { field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION },
        },
      },
      additionalFilters: [
        { exists: { field: METRIC_OTEL_SYSTEM_MEMORY_UTILIZATION } },
        ...termQuery(FAAS_ID, serverlessId),
      ],
      operationName: 'get_otel_system_memory_metrics_charts',
    });
  } else {
    return withApmSpan('get_memory_metrics_charts', async () => {
      const cgroupResponse = await fetchAndTransformMetrics({
        environment,
        kuery,
        config,
        apmEventClient,
        serviceName,
        serviceNodeName,
        start,
        end,
        chartBase,
        aggs: {
          memoryUsedAvg: { avg: { script: cgroupMemory.script } },
          memoryUsedMax: { max: { script: cgroupMemory.script } },
        },
        additionalFilters: [cgroupMemory.filter, ...termQuery(FAAS_ID, serverlessId)],
        operationName: 'get_cgroup_memory_metrics_charts',
      });

      if (cgroupResponse.series.length === 0) {
        return await fetchAndTransformMetrics({
          environment,
          kuery,
          config,
          apmEventClient,
          serviceName,
          serviceNodeName,
          start,
          end,
          chartBase,
          aggs: {
            memoryUsedAvg: { avg: { script: systemMemory.script } },
            memoryUsedMax: { max: { script: systemMemory.script } },
          },
          additionalFilters: [systemMemory.filter, ...termQuery(FAAS_ID, serverlessId)],
          operationName: 'get_system_memory_metrics_charts',
        });
      }

      return cgroupResponse;
    });
  }
}
