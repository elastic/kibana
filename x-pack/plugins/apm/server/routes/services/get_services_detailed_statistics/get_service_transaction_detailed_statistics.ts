/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { withApmSpan } from '../../../utils/with_apm_span';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceTransactionDetailedStats({
  serviceNames,
  environment,
  kuery,
  apmEventClient,
  searchAggregatedTransactions,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const outcomes = getOutcomeAggregation();

  const metrics = {
    avg_duration: {
      avg: {
        field: getDurationFieldForTransactions(searchAggregatedTransactions),
      },
    },
    outcomes,
  };

  const response = await apmEventClient.search(
    'get_service_transaction_detail_stats',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { [SERVICE_NAME]: serviceNames } },
              ...getDocumentTypeFilterForTransactions(
                searchAggregatedTransactions
              ),
              ...rangeQuery(startWithOffset, endWithOffset),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          sample: {
            random_sampler: randomSampler,
            aggs: {
              services: {
                terms: {
                  field: SERVICE_NAME,
                  size: serviceNames.length,
                },
                aggs: {
                  transactionType: {
                    terms: {
                      field: TRANSACTION_TYPE,
                    },
                    aggs: {
                      ...metrics,
                      timeseries: {
                        date_histogram: {
                          field: '@timestamp',
                          fixed_interval:
                            getBucketSizeForAggregatedTransactions({
                              start: startWithOffset,
                              end: endWithOffset,
                              numBuckets: 20,
                              searchAggregatedTransactions,
                            }).intervalString,
                          min_doc_count: 0,
                          extended_bounds: {
                            min: startWithOffset,
                            max: endWithOffset,
                          },
                        },
                        aggs: metrics,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  return keyBy(
    response.aggregations?.sample.services.buckets.map((bucket) => {
      const topTransactionTypeBucket =
        bucket.transactionType.buckets.find(
          ({ key }) =>
            key === TRANSACTION_REQUEST || key === TRANSACTION_PAGE_LOAD
        ) ?? bucket.transactionType.buckets[0];

      return {
        serviceName: bucket.key as string,
        latency: topTransactionTypeBucket.timeseries.buckets.map(
          (dateBucket) => ({
            x: dateBucket.key + offsetInMs,
            y: dateBucket.avg_duration.value,
          })
        ),
        transactionErrorRate: topTransactionTypeBucket.timeseries.buckets.map(
          (dateBucket) => ({
            x: dateBucket.key + offsetInMs,
            y: calculateFailedTransactionRate(dateBucket.outcomes),
          })
        ),
        throughput: topTransactionTypeBucket.timeseries.buckets.map(
          (dateBucket) => ({
            x: dateBucket.key + offsetInMs,
            y: calculateThroughputWithRange({
              start,
              end,
              value: dateBucket.doc_count,
            }),
          })
        ),
      };
    }) ?? [],
    'serviceName'
  );
}

export async function getServiceDetailedStatsPeriods({
  serviceNames,
  environment,
  kuery,
  apmEventClient,
  searchAggregatedTransactions,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_service_detailed_statistics', async () => {
    const commonProps = {
      serviceNames,
      environment,
      kuery,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
      randomSampler,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceTransactionDetailedStats(commonProps),
      offset
        ? getServiceTransactionDetailedStats({
            ...commonProps,
            offset,
          })
        : Promise.resolve({}),
    ]);

    return { currentPeriod, previousPeriod };
  });
}
