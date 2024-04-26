/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { estypes } from '@elastic/elasticsearch';

interface Params {
  esClient: ElasticsearchClient;
  serviceNames: string[];
  identifyingMetadata: string;
  timeFrom: number;
  timeTo: number;
}

interface LogErrorsAggregation extends estypes.AggregationsStringRareTermsBucketKeys {
  logErrors: estypes.AggregationsTermsAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

interface LogRateQueryAggregation {
  services: estypes.AggregationsTermsAggregateBase<LogErrorsAggregation>;
}

export function createGetLogsRatesService() {
  return async ({ esClient, identifyingMetadata, serviceNames, timeFrom, timeTo }: Params) => {
    const esResponse = await esClient.search({
      index: 'logs-*-*',
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'log.level',
              },
            },
            {
              terms: {
                [identifyingMetadata]: serviceNames,
              },
            },
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
            logErrors: {
              terms: {
                field: 'log.level',
                include: 'error',
              },
            },
          },
        },
      },
    });
    const durationAsMinutes = (timeTo - timeFrom) / 1000 / 60;
    const aggregations = esResponse.aggregations as LogRateQueryAggregation | undefined;
    const buckets = aggregations?.services.buckets as LogErrorsAggregation[];

    return buckets.reduce((acc, bucket) => {
      const logRate = bucket.doc_count / durationAsMinutes;
      const logErrorBuckets = bucket.logErrors
        .buckets as estypes.AggregationsStringRareTermsBucketKeys[];

      const logErrorRate = (logErrorBuckets[0]?.doc_count ?? 0) / bucket.doc_count;
      return {
        ...acc,
        [bucket.key]: {
          logRate,
          logErrorRate,
        },
      };
    }, {});
  };
}
