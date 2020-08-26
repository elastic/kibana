/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Unionize, Overwrite } from 'utility-types';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import { ChartBase } from './types';
import { transformDataToMetricsChart } from './transform_metrics_chart';
import { getMetricsProjection } from '../../projections/metrics';
import { mergeProjection } from '../../projections/util/merge_projection';
import { AggregationOptionsByType } from '../../../typings/elasticsearch/aggregations';
import { APMEventESSearchRequest } from '../helpers/create_es_client/create_apm_event_client';

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
  const { start, end, apmEventClient, config } = setup;

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
  });

  const response = await apmEventClient.search(params);

  return transformDataToMetricsChart(response, chartBase);
}
