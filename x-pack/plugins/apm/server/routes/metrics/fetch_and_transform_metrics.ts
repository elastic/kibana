/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unionize } from 'utility-types';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationOptionsByType } from '@kbn/es-types';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getVizColorForIndex } from '../../../common/viz_colors';
import {
  APMEventClient,
  APMEventESSearchRequest,
} from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { ChartBase } from './types';
import {
  environmentQuery,
  serviceNodeNameQuery,
} from '../../../common/utils/environment_query';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { ChartType, Coordinate, YUnit } from '../../../typings/timeseries';
import { APMConfig } from '../..';

type MetricsAggregationMap = Unionize<{
  min: AggregationOptionsByType['min'];
  max: AggregationOptionsByType['max'];
  sum: AggregationOptionsByType['sum'];
  avg: AggregationOptionsByType['avg'];
}>;

type MetricAggs = Record<string, MetricsAggregationMap>;

export type GenericMetricsRequest = APMEventESSearchRequest & {
  body: {
    aggs: {
      timeseriesData: {
        date_histogram: AggregationOptionsByType['date_histogram'];
        aggs: MetricAggs;
      };
    } & MetricAggs;
  };
};

export type GenericMetricsChart = Awaited<FetchAndTransformMetrics>;

export interface FetchAndTransformMetrics {
  title: string;
  key: string;
  yUnit: YUnit;
  series: Array<{
    title: string;
    key: string;
    type: ChartType;
    color: string;
    overallValue: number;
    data: Coordinate[];
  }>;
  description?: string;
}

export async function fetchAndTransformMetrics<T extends MetricAggs>({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  start,
  end,
  chartBase,
  aggs,
  additionalFilters = [],
  operationName,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
  chartBase: ChartBase;
  aggs: T;
  additionalFilters?: QueryDslQueryContainer[];
  operationName: string;
}): Promise<FetchAndTransformMetrics> {
  const params: GenericMetricsRequest = {
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

  const { hits, aggregations } = await apmEventClient.search(
    operationName,
    params
  );
  const timeseriesData = aggregations?.timeseriesData;

  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    description: chartBase.description,
    series:
      hits.total.value === 0
        ? []
        : Object.keys(chartBase.series).map((seriesKey, i) => {
            // @ts-ignore
            const overallValue = aggregations?.[seriesKey]?.value as number;

            return {
              title: chartBase.series[seriesKey].title,
              key: seriesKey,
              type: chartBase.type,
              color:
                chartBase.series[seriesKey].color ||
                getVizColorForIndex(i, theme),
              overallValue,
              data:
                timeseriesData?.buckets.map((bucket) => {
                  const { value } = bucket[seriesKey];
                  const y = value === null || isNaN(value) ? null : value;
                  return {
                    x: bucket.key,
                    y,
                  };
                }) || [],
            };
          }),
  };
}
