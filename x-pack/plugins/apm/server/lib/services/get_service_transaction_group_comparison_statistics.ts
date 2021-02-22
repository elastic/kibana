/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import { Coordinate } from '../../../typings/timeseries';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSize } from '../helpers/get_bucket_size';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { calculateTransactionErrorPercentage } from '../helpers/transaction_error_rate';

export async function getServiceTransactionGroupComparisonStatistics({
  environment,
  serviceName,
  transactionNames,
  setup,
  numBuckets,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  environment?: string;
  serviceName: string;
  transactionNames: string[];
  setup: Setup & SetupTimeRange;
  numBuckets: number;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}): Promise<
  Record<
    string,
    {
      latency: Coordinate[];
      throughput: Coordinate[];
      errorRate: Coordinate[];
      impact: number;
    }
  >
> {
  return withApmSpan(
    'get_service_transaction_group_comparison_statistics',
    async () => {
      const { apmEventClient, start, end, esFilter } = setup;
      const { intervalString } = getBucketSize({ start, end, numBuckets });

      const field = getTransactionDurationFieldForAggregatedTransactions(
        searchAggregatedTransactions
      );

      const response = await apmEventClient.search({
        apm: {
          events: [
            getProcessorEventForAggregatedTransactions(
              searchAggregatedTransactions
            ),
          ],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SERVICE_NAME]: serviceName } },
                { term: { [TRANSACTION_TYPE]: transactionType } },
                ...getDocumentTypeFilterForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
                ...esFilter,
              ],
            },
          },
          aggs: {
            total_duration: { sum: { field } },
            transaction_groups: {
              terms: {
                field: TRANSACTION_NAME,
                include: transactionNames,
                size: transactionNames.length,
              },
              aggs: {
                transaction_group_total_duration: {
                  sum: { field },
                },
                timeseries: {
                  date_histogram: {
                    field: '@timestamp',
                    fixed_interval: intervalString,
                    min_doc_count: 0,
                    extended_bounds: {
                      min: start,
                      max: end,
                    },
                  },
                  aggs: {
                    throughput_rate: {
                      rate: {
                        unit: 'minute',
                      },
                    },
                    ...getLatencyAggregation(latencyAggregationType, field),
                    [EVENT_OUTCOME]: {
                      terms: {
                        field: EVENT_OUTCOME,
                        include: [EventOutcome.failure, EventOutcome.success],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const buckets = response.aggregations?.transaction_groups.buckets ?? [];

      const totalDuration = response.aggregations?.total_duration.value;
      return keyBy(
        buckets.map((bucket) => {
          const transactionName = bucket.key;
          const latency = bucket.timeseries.buckets.map((timeseriesBucket) => ({
            x: timeseriesBucket.key,
            y: getLatencyValue({
              latencyAggregationType,
              aggregation: timeseriesBucket.latency,
            }),
          }));
          const throughput = bucket.timeseries.buckets.map(
            (timeseriesBucket) => ({
              x: timeseriesBucket.key,
              y: timeseriesBucket.throughput_rate.value,
            })
          );
          const errorRate = bucket.timeseries.buckets.map(
            (timeseriesBucket) => ({
              x: timeseriesBucket.key,
              y: calculateTransactionErrorPercentage(
                timeseriesBucket[EVENT_OUTCOME]
              ),
            })
          );
          const transactionGroupTotalDuration =
            bucket.transaction_group_total_duration.value || 0;
          return {
            transactionName,
            latency,
            throughput,
            errorRate,
            impact: totalDuration
              ? (transactionGroupTotalDuration * 100) / totalDuration
              : 0,
          };
        }),
        'transactionName'
      );
    }
  );
}
