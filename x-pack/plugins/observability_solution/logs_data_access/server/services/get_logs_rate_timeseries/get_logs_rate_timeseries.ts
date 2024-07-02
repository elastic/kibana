/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationOptionsByType, AggregationResultOf } from '@kbn/es-types';
import { ElasticsearchClient } from '@kbn/core/server';
import { existsQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { estypes } from '@elastic/elasticsearch';
import { getBucketSizeFromTimeRangeAndBucketCount } from '../../utils';
import { LOG_LEVEL } from '../../es_fields';

export interface LogsRateTimeseries {
  esClient: ElasticsearchClient;
  serviceEnvironmentQuery?: QueryDslQueryContainer[];
  serviceNames: string[];
  identifyingMetadata: string;
  timeFrom: number;
  timeTo: number;
  kuery?: string;
}

interface LogsRateTimeseriesHistogram {
  timeseries: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
    },
    {}
  >;
  doc_count: number;
  key: string;
}

interface LogRateQueryAggregation {
  service: estypes.AggregationsTermsAggregateBase<LogsRateTimeseriesHistogram>;
}
export interface LogsRateTimeseriesReturnType {
  [serviceName: string]: Array<{ x: number; y: number | null }>;
}
export function createGetLogsRateTimeseries() {
  return async ({
    esClient,
    identifyingMetadata,
    serviceNames,
    timeFrom,
    timeTo,
    kuery,
    serviceEnvironmentQuery = [],
  }: LogsRateTimeseries): Promise<LogsRateTimeseriesReturnType> => {
    const intervalString = getBucketSizeFromTimeRangeAndBucketCount(timeFrom, timeTo, 50);

    const esResponse = await esClient.search({
      index: 'logs-*-*',
      size: 0,
      query: {
        bool: {
          filter: [
            ...existsQuery(LOG_LEVEL),
            ...kqlQuery(kuery),
            {
              terms: {
                [identifyingMetadata]: serviceNames,
              },
            },
            ...serviceEnvironmentQuery,
            {
              range: {
                ['@timestamp']: {
                  gte: timeFrom,
                  lte: timeTo,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      aggs: {
        service: {
          terms: {
            field: identifyingMetadata,
          },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: `${intervalString}s`,
                min_doc_count: 0,
                extended_bounds: {
                  min: timeFrom,
                  max: timeTo,
                },
              },
            },
          },
        },
      },
    });

    const aggregations = esResponse.aggregations as LogRateQueryAggregation | undefined;
    const buckets = aggregations?.service.buckets as LogsRateTimeseriesHistogram[];

    return buckets
      ? buckets.reduce<LogsRateTimeseriesReturnType>((acc, bucket) => {
          const totalCount = bucket.doc_count;

          const timeseries = bucket.timeseries.buckets.map((timeseriesBucket) => {
            return {
              x: timeseriesBucket.key,
              y: timeseriesBucket.doc_count / totalCount,
            };
          });

          return {
            ...acc,
            [bucket.key]: timeseries,
          };
        }, {})
      : {};
  };
}
