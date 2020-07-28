/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Unionize, Overwrite } from 'utility-types';
import { ESSearchRequest } from '../../../typings/elasticsearch';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { ChartBase } from './types';
import { transformDataToMetricsChart } from './transform_metrics_chart';
import { getMetricsProjection } from '../../../common/projections/metrics';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { AggregationOptionsByType } from '../../../typings/elasticsearch/aggregations';

type MetricsAggregationMap = Unionize<{
  min: AggregationOptionsByType['min'];
  max: AggregationOptionsByType['max'];
  sum: AggregationOptionsByType['sum'];
  avg: AggregationOptionsByType['avg'];
}>;

type MetricAggs = Record<string, MetricsAggregationMap>;

export type GenericMetricsRequest = Overwrite<
  ESSearchRequest,
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
}

export async function fetchAndTransformMetrics<T extends MetricAggs>({
  setup,
  serviceName,
  serviceNodeName,
  chartBase,
  aggs,
  additionalFilters = [],
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  serviceNodeName?: string;
  chartBase: ChartBase;
  aggs: T;
  additionalFilters?: Filter[];
}) {
  const { start, end, client } = setup;

  const projection = getMetricsProjection({
    setup,
    serviceName,
    serviceNodeName,
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
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs,
        },
        ...aggs,
      },
    },
  });

  const response = await client.search(params);

  return transformDataToMetricsChart(response, chartBase);
}
