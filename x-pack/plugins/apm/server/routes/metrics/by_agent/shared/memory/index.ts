/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  METRIC_CGROUP_MEMORY_LIMIT_BYTES,
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../../../../common/elasticsearch_fieldnames';
import {
  environmentQuery,
  serviceNodeNameQuery,
} from '../../../../../../common/utils/environment_query';
import { getMetricsDateHistogramParams } from '../../../../../lib/helpers/metrics';
import { Setup } from '../../../../../lib/helpers/setup_request';
import { withApmSpan } from '../../../../../utils/with_apm_span';
import type { FetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { getVizColorForIndex } from '../../../../../../common/viz_colors';

export const percentSystemMemoryUsedScript = {
  lang: 'painless',
  source: `
    if(doc.containsKey('${METRIC_SYSTEM_FREE_MEMORY}') && doc.containsKey('${METRIC_SYSTEM_TOTAL_MEMORY}')){
      double freeMemoryValue =  doc['${METRIC_SYSTEM_FREE_MEMORY}'].value;
      double totalMemoryValue = doc['${METRIC_SYSTEM_TOTAL_MEMORY}'].value;
      return 1 - freeMemoryValue / totalMemoryValue
    }
    
    return null;
  `,
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

export async function getMemoryInfo({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
  faasId,
  start,
  end,
  additionalFilters,
  script,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  faasId?: string;
  start: number;
  end: number;
  additionalFilters: ESFilter[];
  script:
    | typeof percentCgroupMemoryUsedScript
    | typeof percentSystemMemoryUsedScript;
}) {
  const { apmEventClient, config } = setup;

  const aggs = {
    memoryUsedAvg: { avg: { script } },
    memoryUsedMax: { max: { script } },
  };

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: 1,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...serviceNodeNameQuery(serviceNodeName),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...additionalFilters,
          ],
        },
      },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams({
            start,
            end,
            metricsInterval: config.metricsInterval,
          }),
          aggs,
        },
        ...aggs,
      },
    },
  };

  const response = await apmEventClient.search('get_memory_info', params);

  return {
    hasData: response.hits.total.value > 0,
    memoryUsedAvg: response.aggregations?.memoryUsedAvg.value || 0,
    memoryUsedMax: response.aggregations?.memoryUsedMax.value || 0,
    timeseries: {
      memoryUsedAvg:
        response.aggregations?.timeseriesData.buckets.map((bucket) => {
          const value = bucket.memoryUsedAvg.value;
          const y = value === null || isNaN(value) ? null : value;
          return { x: bucket.key, y };
        }) || [],
      memoryUsedMax:
        response.aggregations?.timeseriesData.buckets.map((bucket) => {
          const value = bucket.memoryUsedMax.value;
          const y = value === null || isNaN(value) ? null : value;
          return { x: bucket.key, y };
        }) || [],
    },
  };
}

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
}): Promise<FetchAndTransformMetrics> {
  return withApmSpan('get_memory_metrics_charts', async () => {
    const options = {
      environment,
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      start,
      end,
    };
    let memoryInfo = await getMemoryInfo({
      ...options,
      additionalFilters: [
        { exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES } },
      ],
      script: percentCgroupMemoryUsedScript,
    });

    if (!memoryInfo.hasData) {
      memoryInfo = await getMemoryInfo({
        ...options,
        additionalFilters: [
          { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
          { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
        ],
        script: percentSystemMemoryUsedScript,
      });
    }

    return {
      key: 'memory_usage_chart',
      title: i18n.translate(
        'xpack.apm.serviceDetails.metrics.memoryUsageChartTitle',
        { defaultMessage: 'System memory usage' }
      ),
      yUnit: 'percent',
      series: [
        {
          key: 'memoryUsedMax',
          title: i18n.translate('xpack.apm.chart.memorySeries.systemMaxLabel', {
            defaultMessage: 'Max',
          }),
          type: 'linemark',
          color: getVizColorForIndex(0, theme),
          overallValue: memoryInfo.memoryUsedMax,
          data: memoryInfo.timeseries.memoryUsedMax,
        },
        {
          key: 'memoryUsedAvg',
          title: i18n.translate(
            'xpack.apm.chart.memorySeries.systemAverageLabel',
            { defaultMessage: 'Average' }
          ),
          type: 'linemark',
          color: getVizColorForIndex(1, theme),
          overallValue: memoryInfo.memoryUsedAvg,
          data: memoryInfo.timeseries.memoryUsedAvg,
        },
      ],
    };
  });
}
