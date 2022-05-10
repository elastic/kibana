/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unionize } from 'utility-types';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { AggregationOptionsByType } from '@kbn/core/types/elasticsearch';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { getVizColorForIndex } from '../../../common/viz_colors';
import { APMEventESSearchRequest } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { Setup } from '../../lib/helpers/setup_request';
import { ChartBase } from './types';
import {
  environmentQuery,
  serviceNodeNameQuery,
} from '../../../common/utils/environment_query';
import { ProcessorEvent } from '../../../common/processor_event';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';

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

export type GenericMetricsChart = Awaited<
  ReturnType<typeof fetchAndTransformMetrics>
>;

export async function fetchAndTransformMetrics<T extends MetricAggs>({
  environment,
  kuery,
  setup,
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
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
  chartBase: ChartBase;
  aggs: T;
  additionalFilters?: QueryDslQueryContainer[];
  operationName: string;
}) {
  const { apmEventClient, config } = setup;

  const params: GenericMetricsRequest = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
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
