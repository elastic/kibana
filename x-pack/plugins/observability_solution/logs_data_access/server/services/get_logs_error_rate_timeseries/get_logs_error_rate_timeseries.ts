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
import { RegisterServicesParams } from '../register_services';
import { getBucketSizeFromTimeRangeAndBucketCount, getLogErrorRate } from '../../utils';

export interface LogsErrorRateTimeseries {
  esClient: ElasticsearchClient;
  serviceEnvironmentQuery?: QueryDslQueryContainer[];
  serviceNames: string[];
  identifyingMetadata: string;
  timeFrom: number;
  timeTo: number;
  kuery?: string;
}

interface LogsErrorRateTimeseriesHistogram {
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
  services: estypes.AggregationsTermsAggregateBase<LogsErrorRateTimeseriesHistogram>;
}
export interface LogsErrorRateTimeseriesReturnType {
  [serviceName: string]: Array<{ x: number; y: number | null }>;
}
export function createGetLogErrorRateTimeseries(params: RegisterServicesParams) {
  return async ({
    esClient,
    identifyingMetadata,
    serviceNames,
    timeFrom,
    timeTo,
    kuery,
    serviceEnvironmentQuery = [],
  }: LogsErrorRateTimeseries): Promise<LogsErrorRateTimeseriesReturnType> => {
    const intervalString = getBucketSizeFromTimeRangeAndBucketCount(timeFrom, timeTo, 50);

    const esResponse = await esClient.search({
      index: 'logs-*-*',
      size: 0,
      query: {
        bool: {
          filter: [
            ...existsQuery('log.level'),
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
        services: {
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
              aggs: {
                logErrors: {
                  terms: {
                    field: 'log.level',
                    include: ['error', 'ERROR'],
                  },
                },
              },
            },
          },
        },
      },
    });

    const aggregations = esResponse.aggregations as LogRateQueryAggregation | undefined;
    const buckets = aggregations?.services.buckets as LogsErrorRateTimeseriesHistogram[];

    return buckets
      ? buckets.reduce<LogsErrorRateTimeseriesReturnType>((acc, bucket) => {
          const totalCount = bucket.doc_count;

          const timeseries = bucket.timeseries.buckets.map((timeseriesBucket) => {
            const logErrorCount = timeseriesBucket.doc_count;

            return {
              x: timeseriesBucket.key,
              y: getLogErrorRate({ logCount: totalCount, logErrorCount }),
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
