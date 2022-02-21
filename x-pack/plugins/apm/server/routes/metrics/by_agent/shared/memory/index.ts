/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { withApmSpan } from '../../../../../utils/with_apm_span';
import {
  METRIC_CGROUP_MEMORY_LIMIT_BYTES,
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../../lib/helpers/setup_request';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { ChartBase } from '../../../types';

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
  title: i18n.translate(
    'xpack.apm.serviceDetails.metrics.memoryUsageChartTitle',
    {
      defaultMessage: 'System memory usage',
    }
  ),
  key: 'memory_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series,
};

export const percentSystemMemoryUsedScript = {
  lang: 'expression',
  source: `1 - doc['${METRIC_SYSTEM_FREE_MEMORY}'] / doc['${METRIC_SYSTEM_TOTAL_MEMORY}']`,
} as const;

export const percentCgroupMemoryUsedScript = {
  lang: 'painless',
  source: `
    /*
      When no limit is specified in the container, docker allows the app as much memory / swap memory as it wants.
      This number represents the max possible value for the limit field.
    */
    double CGROUP_LIMIT_MAX_VALUE = 9223372036854771712L;

    String limitKey = '${METRIC_CGROUP_MEMORY_LIMIT_BYTES}';

    //Should use cgropLimit when value is not empty and not equals to the max limit value.
    boolean useCgroupLimit = doc.containsKey(limitKey) && !doc[limitKey].empty && doc[limitKey].value != CGROUP_LIMIT_MAX_VALUE;

    double total = useCgroupLimit ? doc[limitKey].value : doc['${METRIC_SYSTEM_TOTAL_MEMORY}'].value;

    double used = doc['${METRIC_CGROUP_MEMORY_USAGE_BYTES}'].value;

    return used / total;
    `,
} as const;

export async function getMemoryChartData({
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
  return withApmSpan('get_memory_metrics_charts', async () => {
    const cgroupResponse = await fetchAndTransformMetrics({
      environment,
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      start,
      end,
      chartBase,
      aggs: {
        memoryUsedAvg: { avg: { script: percentCgroupMemoryUsedScript } },
        memoryUsedMax: { max: { script: percentCgroupMemoryUsedScript } },
      },
      additionalFilters: [
        { exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES } },
      ],
      operationName: 'get_cgroup_memory_metrics_charts',
    });

    if (cgroupResponse.series.length === 0) {
      return await fetchAndTransformMetrics({
        environment,
        kuery,
        setup,
        serviceName,
        serviceNodeName,
        start,
        end,
        chartBase,
        aggs: {
          memoryUsedAvg: { avg: { script: percentSystemMemoryUsedScript } },
          memoryUsedMax: { max: { script: percentSystemMemoryUsedScript } },
        },
        additionalFilters: [
          { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
          { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
        ],
        operationName: 'get_system_memory_metrics_charts',
      });
    }

    return cgroupResponse;
  });
}
