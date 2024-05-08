/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { estypes } from '@elastic/elasticsearch';
import { RegisterServicesParams } from '../register_services';
import { getLogErrorRate, getLogRatePerMinute } from './utils';

export interface LogsRatesServiceParams {
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

export interface LogsRatesServiceReturnType {
  [serviceName: string]: {
    logRatePerMinute: number;
    logErrorRate: null | number;
  };
}

export function createGetLogsRatesService(params: RegisterServicesParams) {
  return async ({
    esClient,
    identifyingMetadata,
    serviceNames,
    timeFrom,
    timeTo,
  }: LogsRatesServiceParams): Promise<LogsRatesServiceReturnType> => {
    const esResponse = await esClient.search({
      index: 'logs-*-*',
      size: 0,
      query: {
        bool: {
          filter: [
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
                include: ['error', 'ERROR'],
              },
            },
          },
        },
      },
    });
    const aggregations = esResponse.aggregations as LogRateQueryAggregation | undefined;
    const buckets = aggregations?.services.buckets as LogErrorsAggregation[] | undefined;

    return buckets
      ? buckets.reduce<LogsRatesServiceReturnType>((acc, bucket) => {
          const logCount = bucket.doc_count;
          const logErrorBuckets = bucket.logErrors
            .buckets as estypes.AggregationsStringRareTermsBucketKeys[];

          const logErrorCount = logErrorBuckets[0]?.doc_count;

          return {
            ...acc,
            [bucket.key]: {
              logRatePerMinute: getLogRatePerMinute({ logCount, timeFrom, timeTo }),
              logErrorRate: logErrorCount ? getLogErrorRate({ logCount, logErrorCount }) : null,
            },
          };
        }, {})
      : {};
  };
}
