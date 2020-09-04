/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  METRIC_CGROUP_MEMORY_LIMIT_BYTES,
  METRIC_CGROUP_MEMORY_STATS_INACTIVE_FILE_BYTES,
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
} from '../../../../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../../../helpers/setup_request';
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
};

export const percentCgroupMemoryUsedScript = {
  lang: 'expression',
  source: `(doc['${METRIC_CGROUP_MEMORY_USAGE_BYTES}'] - doc['${METRIC_CGROUP_MEMORY_STATS_INACTIVE_FILE_BYTES}']) / (doc['${METRIC_CGROUP_MEMORY_LIMIT_BYTES}'] ? doc['${METRIC_CGROUP_MEMORY_LIMIT_BYTES}'] : doc['${METRIC_SYSTEM_TOTAL_MEMORY}'])`,
};

export async function getMemoryChartData(
  setup: Setup & SetupTimeRange & SetupUIFilters,
  serviceName: string,
  serviceNodeName?: string
) {
  const cgroupResponse = await fetchAndTransformMetrics({
    setup,
    serviceName,
    serviceNodeName,
    chartBase,
    aggs: {
      memoryUsedAvg: { avg: { script: percentCgroupMemoryUsedScript } },
      memoryUsedMax: { max: { script: percentCgroupMemoryUsedScript } },
    },
    additionalFilters: [
      {
        exists: {
          field: METRIC_CGROUP_MEMORY_USAGE_BYTES,
        },
      },
    ],
  });

  if (cgroupResponse.noHits) {
    return await fetchAndTransformMetrics({
      setup,
      serviceName,
      serviceNodeName,
      chartBase,
      aggs: {
        memoryUsedAvg: { avg: { script: percentSystemMemoryUsedScript } },
        memoryUsedMax: { max: { script: percentSystemMemoryUsedScript } },
      },
      additionalFilters: [
        {
          exists: {
            field: METRIC_SYSTEM_FREE_MEMORY,
          },
        },
        {
          exists: {
            field: METRIC_SYSTEM_TOTAL_MEMORY,
          },
        },
      ],
    });
  }

  return cgroupResponse;
}
