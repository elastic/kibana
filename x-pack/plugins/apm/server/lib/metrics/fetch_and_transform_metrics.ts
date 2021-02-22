/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Overwrite, Unionize } from 'utility-types';
import {
  AggregationOptionsByType,
  ESFilter,
} from '../../../../../typings/elasticsearch';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  environmentQuery,
  rangeQuery,
  serviceNodeNameQuery,
} from '../../../common/utils/queries';
import { APMEventESSearchRequest } from '../helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { transformDataToMetricsChart } from './transform_metrics_chart';
import { ChartBase } from './types';

type MetricsAggregationMap = Unionize<{
  min: AggregationOptionsByType['min'];
  max: AggregationOptionsByType['max'];
  sum: AggregationOptionsByType['sum'];
  avg: AggregationOptionsByType['avg'];
}>;

type MetricAggs = Record<string, MetricsAggregationMap>;

export type GenericMetricsRequest = Overwrite<
  APMEventESSearchRequest,
  {
    body: {
      size: number;
      aggs: {
        timeseriesData: {
          date_histogram: AggregationOptionsByType['date_histogram'];
          aggs: MetricAggs;
        };
      } & MetricAggs;
      query: { bool: { filter: ESFilter[] } };
    };
  }
>;

export async function fetchAndTransformMetrics<T extends MetricAggs>({
  environment,
  setup,
  serviceName,
  serviceNodeName,
  chartBase,
  aggs,
  additionalFilters = [],
}: {
  environment?: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
  chartBase: ChartBase;
  aggs: T;
  additionalFilters?: ESFilter[];
}) {
  const { start, end, apmEventClient, config, esFilter } = setup;

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
            ...esFilter,
            ...additionalFilters,
          ],
        },
      },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams(
            start,
            end,
            config['xpack.apm.metricsInterval']
          ),
          aggs,
        },
        ...aggs,
      },
    },
  };

  const response = await apmEventClient.search(params);

  return transformDataToMetricsChart(response, chartBase);
}
