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
import { getBucketSizeFromTimeRangeAndBucketCount, getLogErrorRate } from '../../utils';
import { APM_LOG_LEVEL, LOG_LEVEL } from '../../es_fields';

export interface LogsErrorRateTimeseries {
  esClient: ElasticsearchClient;
  serviceEnvironmentQuery?: QueryDslQueryContainer[];
  serviceNames: string[];
  identifyingMetadata: string;
  timeFrom: number;
  timeTo: number;
  kuery?: string;
}

const getLogErrorsAggregation = () => ({
  terms: {
    field: LOG_LEVEL,
    include: ['error', 'ERROR'],
  },
});

const getApmLogErrorsAggregation = () => ({
  terms: {
    field: APM_LOG_LEVEL,
    include: ['error', 'ERROR'],
  },
});

type LogErrorsAggregation = ReturnType<typeof getLogErrorsAggregation>;
type ApmLogErrorsAggregation = ReturnType<typeof getApmLogErrorsAggregation>;
interface LogsErrorRateTimeseriesHistogram {
  timeseries: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
      aggs: { logErrors: LogErrorsAggregation; apmLogErrors: ApmLogErrorsAggregation };
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
export function createGetLogErrorRateTimeseries() {
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
            {
              bool: {
                minimum_should_match: 1,
                should: [...existsQuery(LOG_LEVEL), ...existsQuery(APM_LOG_LEVEL)],
              },
            },
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
                logErrors: getLogErrorsAggregation(),
                apmLogErrors: getApmLogErrorsAggregation(),
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
          const timeseries = bucket.timeseries.buckets.map((timeseriesBucket) => {
            const totalCount = timeseriesBucket.doc_count;
            const logErrorCount = timeseriesBucket.logErrors.buckets[0]?.doc_count;
            const apmLogErrorCount = timeseriesBucket.apmLogErrors.buckets[0]?.doc_count;
            const logAndApmErrorCount = logErrorCount ?? apmLogErrorCount ?? 0;

            return {
              x: timeseriesBucket.key,
              y:
                logAndApmErrorCount > 0
                  ? getLogErrorRate({ logCount: totalCount, logErrorCount: logAndApmErrorCount })
                  : null,
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
