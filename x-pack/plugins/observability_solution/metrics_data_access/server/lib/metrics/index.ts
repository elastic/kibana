/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '@kbn/io-ts-utils';
const TIMESTAMP_FIELD = '@timestamp';
import { MetricsAPIRequest, MetricsAPIResponse } from '../../../common/http_api/metrics_api';
import {
  ESSearchClient,
  CompositeResponseRT,
  MetricsESResponse,
  AggregationResponseRT,
  AggregationResponse,
  CompositeResponse,
  HistogramBucketRT,
} from './types';
import { EMPTY_RESPONSE } from './constants';
import { createAggregations, createCompositeAggregations } from './lib/create_aggregations';
import { convertBucketsToMetricsApiSeries } from './lib/convert_buckets_to_metrics_series';
import { calculateBucketSize } from './lib/calculate_bucket_size';
import { calculatedInterval } from './lib/calculate_interval';

const DEFAULT_LIMIT = 9;

export const query = async (
  search: ESSearchClient,
  rawOptions: MetricsAPIRequest
): Promise<MetricsAPIResponse> => {
  const interval = await calculatedInterval(search, rawOptions);

  const options = {
    ...rawOptions,
    timerange: {
      ...rawOptions.timerange,
      interval,
    },
  };
  const hasGroupBy = Array.isArray(options.groupBy) && options.groupBy.length > 0;
  const groupInstanceFilter =
    options.groupInstance?.reduce<Array<Record<string, unknown>>>((acc, group, index) => {
      const key = options.groupBy?.[index];
      if (key && group) {
        acc.push({ term: { [key]: group } });
      }
      return acc;
    }, []) ?? [];
  const filter: Array<Record<string, any>> = [
    {
      range: {
        [TIMESTAMP_FIELD]: {
          gte: options.timerange.from,
          lte: options.timerange.to,
          format: 'epoch_millis',
        },
      },
    },
    ...(options.groupBy?.map((field) => ({ exists: { field } })) ?? []),
    ...groupInstanceFilter,
  ];

  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: options.indexPattern,
    body: {
      size: 0,
      query: { bool: { filter: [...filter, ...(options.filters ?? [])] } },
      aggs: hasGroupBy ? createCompositeAggregations(options) : createAggregations(options),
    },
  };

  try {
    const response = await search<{}, MetricsESResponse>(params);

    if (response.hits.total.value === 0) {
      return EMPTY_RESPONSE;
    }

    if (!response.aggregations) {
      throw new Error('Aggregations should be present.');
    }

    const { bucketSize } = calculateBucketSize({ ...options.timerange, interval });

    if (hasGroupBy) {
      const aggregations = decodeOrThrow(CompositeResponseRT)(response.aggregations);
      const { groupings } = aggregations;
      const limit = options.limit ?? DEFAULT_LIMIT;
      const returnAfterKey = !!groupings.after_key && groupings.buckets.length === limit;
      const afterKey = returnAfterKey ? groupings.after_key : null;

      return {
        series: getSeriesFromCompositeAggregations(groupings, options, bucketSize * 1000),
        info: {
          afterKey,
          interval: rawOptions.includeTimeseries ? bucketSize : undefined,
        },
      };
    }

    const aggregations = decodeOrThrow(AggregationResponseRT)(response.aggregations);
    return {
      series: getSeriesFromHistogram(aggregations, options, bucketSize * 1000),
      info: {
        afterKey: null,
        interval: bucketSize,
      },
    };
  } catch (e) {
    throw e;
  }
};

const getSeriesFromHistogram = (
  aggregations: AggregationResponse,
  options: MetricsAPIRequest,
  bucketSize: number
): MetricsAPIResponse['series'] => {
  return [
    convertBucketsToMetricsApiSeries(['*'], options, aggregations.histogram.buckets, bucketSize),
  ];
};

const getSeriesFromCompositeAggregations = (
  groupings: CompositeResponse['groupings'],
  options: MetricsAPIRequest,
  bucketSize: number
): MetricsAPIResponse['series'] => {
  return groupings.buckets.map((bucket) => {
    const keys = Object.values(bucket.key);
    const metricsetNames = bucket.metricsets.buckets.map((m) => m.key);
    const metrics = convertBucketsToMetricsApiSeries(
      keys,
      options,
      HistogramBucketRT.is(bucket) ? bucket.histogram.buckets : [bucket],
      bucketSize
    );
    return { ...metrics, metricsets: metricsetNames };
  });
};
