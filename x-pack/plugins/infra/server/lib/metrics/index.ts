/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { MetricsAPIRequest, MetricsAPIResponse, afterKeyObjectRT } from '../../../common/http_api';
import {
  ESSearchClient,
  GroupingResponseRT,
  MetricsESResponse,
  HistogramResponseRT,
} from './types';
import { EMPTY_RESPONSE } from './constants';
import { createAggregations } from './lib/create_aggregations';
import { convertHistogramBucketsToTimeseries } from './lib/convert_histogram_buckets_to_timeseries';
import { calculateBucketSize } from './lib/calculate_bucket_size';
import { calculatedInterval } from './lib/calculate_interval';

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
  const filter: Array<Record<string, any>> = [
    {
      range: {
        [options.timerange.field]: {
          gte: options.timerange.from,
          lte: options.timerange.to,
          format: 'epoch_millis',
        },
      },
    },
    ...(options.groupBy?.map((field) => ({ exists: { field } })) ?? []),
  ];

  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    index: options.indexPattern,
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: { ...createAggregations(options) },
    },
  };

  if (hasGroupBy) {
    if (options.afterKey) {
      if (afterKeyObjectRT.is(options.afterKey)) {
        set(params, 'body.aggs.groupings.composite.after', options.afterKey);
      } else {
        set(params, 'body.aggs.groupings.composite.after', { groupBy0: options.afterKey });
      }
    }
  }

  if (options.filters) {
    params.body.query.bool.filter = [...params.body.query.bool.filter, ...options.filters];
  }

  const response = await search<{}, MetricsESResponse>(params);

  if (response.hits.total.value === 0) {
    return EMPTY_RESPONSE;
  }

  if (!response.aggregations) {
    throw new Error('Aggregations should be present.');
  }

  const { bucketSize } = calculateBucketSize({ ...options.timerange, interval });

  if (hasGroupBy && GroupingResponseRT.is(response.aggregations)) {
    const { groupings } = response.aggregations;
    const { after_key: afterKey } = groupings;
    const limit = options.limit || 9;
    const returnAfterKey = afterKey && groupings.buckets.length === limit ? true : false;
    return {
      series: groupings.buckets.map((bucket) => {
        const keys = Object.values(bucket.key);
        return convertHistogramBucketsToTimeseries(keys, options, bucket.histogram.buckets);
      }),
      info: {
        afterKey: returnAfterKey ? afterKey : null,
        interval: bucketSize,
      },
    };
  } else if (hasGroupBy) {
    ThrowReporter.report(GroupingResponseRT.decode(response.aggregations));
  }

  if (HistogramResponseRT.is(response.aggregations)) {
    return {
      series: [
        convertHistogramBucketsToTimeseries(
          ['*'],
          options,
          response.aggregations.histogram.buckets
        ),
      ],
      info: {
        afterKey: null,
        interval: bucketSize,
      },
    };
  } else {
    ThrowReporter.report(HistogramResponseRT.decode(response.aggregations));
  }

  throw new Error('Elasticsearch responsed with an unrecoginzed format.');
};
