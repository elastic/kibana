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
  lang: 'painless',
  source: `
    boolean isFieldAvailable(def doc, def x) {
      return doc.containsKey(x) 
        && !doc[x].empty
    }

    if(!isFieldAvailable(doc, '${METRIC_CGROUP_MEMORY_USAGE_BYTES}')) {
      return null;     
    }
    
    double total = doc['${METRIC_CGROUP_MEMORY_USAGE_BYTES}'].value;

    double limit = -1;
    if(isFieldAvailable(doc, '${METRIC_CGROUP_MEMORY_LIMIT_BYTES}')){
      limit = doc['${METRIC_CGROUP_MEMORY_LIMIT_BYTES}'].value
    }else if (isFieldAvailable(doc, '${METRIC_SYSTEM_TOTAL_MEMORY}')){
      limit = doc['${METRIC_SYSTEM_TOTAL_MEMORY}'].value
    }
    
    if(limit == -1) {
      return null;
    }
    
    double inactive_files = 0;
    if(isFieldAvailable(doc, '${METRIC_CGROUP_MEMORY_STATS_INACTIVE_FILE_BYTES}')){
      inactive_files = doc['${METRIC_CGROUP_MEMORY_STATS_INACTIVE_FILE_BYTES}'].value
    }
    
    return (total - inactive_files) / limit;
  `,
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
