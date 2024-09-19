/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Overwrite, Unionize } from 'utility-types';
import { AggregationOptionsByType } from '../../../../../../src/core/types/elasticsearch';
import { getMetricsProjection } from '../../projections/metrics';
import { mergeProjection } from '../../projections/util/merge_projection';
import { APMEventESSearchRequest } from '../helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { Setup } from '../helpers/setup_request';
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
      aggs: {
        timeseriesData: {
          date_histogram: AggregationOptionsByType['date_histogram'];
          aggs: MetricAggs;
        };
      } & MetricAggs;
    };
  }
>;

interface Filter {
  exists?: {
    field: string;
  };
  term?: {
    [key: string]: string;
  };
  terms?: {
    [key: string]: string[];
  };
}

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
  additionalFilters?: Filter[];
  operationName: string;
}) {
  const { apmEventClient, config } = setup;

  const projection = getMetricsProjection({
    environment,
    kuery,
    serviceName,
    serviceNodeName,
    start,
    end,
  });

  const params: GenericMetricsRequest = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...projection.body.query.bool.filter, ...additionalFilters],
        },
      },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams({
            start,
            end,
            metricsInterval: config['xpack.apm.metricsInterval'],
          }),
          aggs,
        },
        ...aggs,
      },
    },
  });

  const response = await apmEventClient.search(operationName, params);

  return transformDataToMetricsChart(response, chartBase);
}
