/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_FAILURE_COUNT,
  TRANSACTION_SUCCESS_COUNT,
} from '../../../../common/elasticsearch_fieldnames';
import { withApmSpan } from '../../../utils/with_apm_span';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../../../lib/helpers/setup_request';
import { calculateFailedTransactionRateFromServiceMetrics } from '../../../lib/helpers/transaction_error_rate';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getDocumentTypeFilterForServiceMetrics } from '../../../lib/helpers/service_metrics';

export async function getServiceAggregatedTransactionDetailedStats({
  serviceNames,
  environment,
  kuery,
  setup,
  searchAggregatedServiceMetrics,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  setup: Setup;
  searchAggregatedServiceMetrics: boolean;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  const { apmEventClient } = setup;
  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const metrics = {
    avg_duration: {
      avg: {
        field: TRANSACTION_DURATION_SUMMARY,
      },
    },
    failure_count: {
      sum: {
        field: TRANSACTION_FAILURE_COUNT,
      },
    },
    success_count: {
      sum: {
        field: TRANSACTION_SUCCESS_COUNT,
      },
    },
  };

  const response = await apmEventClient.search(
    'get_service_aggregated_transaction_detail_stats',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { [SERVICE_NAME]: serviceNames } },
              ...getDocumentTypeFilterForServiceMetrics(),
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
                              searchAggregatedServiceMetrics,
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
            y: calculateFailedTransactionRateFromServiceMetrics({
              failedTransactions: dateBucket.failure_count.value,
              successfulTransactions: dateBucket.success_count.value,
            }),
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

export async function getServiceAggregatedDetailedStatsPeriods({
  serviceNames,
  environment,
  kuery,
  setup,
  searchAggregatedServiceMetrics,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  setup: Setup;
  searchAggregatedServiceMetrics: boolean;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_service_aggregated_detailed_stats', async () => {
    const commonProps = {
      serviceNames,
      environment,
      kuery,
      setup,
      searchAggregatedServiceMetrics,
      start,
      end,
      randomSampler,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceAggregatedTransactionDetailedStats(commonProps),
      offset
        ? getServiceAggregatedTransactionDetailedStats({
            ...commonProps,
            offset,
          })
        : Promise.resolve({}),
    ]);

    return { currentPeriod, previousPeriod };
  });
}
