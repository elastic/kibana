/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Coordinate } from '../../../../typings/timeseries';
import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { getLatencyValue } from '../../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getTimeseriesDataForTransactionGroups } from '../get_service_transaction_groups/get_timeseries_data_for_transaction_groups';

export async function getServiceTransactionGroupsMetrics({
  serviceName,
  transactionNames,
  setup,
  numBuckets,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
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
      latency: { timeseries: Coordinate[] };
      throughput: { timeseries: Coordinate[] };
      errorRate: { timeseries: Coordinate[] };
    }
  >
> {
  const { apmEventClient, start, end, esFilter } = setup;

  const buckets = await getTimeseriesDataForTransactionGroups({
    apmEventClient,
    start,
    end,
    esFilter,
    numBuckets,
    searchAggregatedTransactions,
    serviceName,
    transactionNames,
    transactionType,
    latencyAggregationType,
  });
  const deltaAsMinutes = (end - start) / 1000 / 60;

  return buckets.reduce((bucketAcc, bucket) => {
    const transactionName = bucket.key;
    return {
      ...bucketAcc,
      [transactionName]: bucket.timeseries.buckets.reduce(
        (acc, timeseriesBucket) => {
          const x = timeseriesBucket.key;
          return {
            ...acc,
            latency: {
              timeseries: [
                ...acc.latency.timeseries,
                {
                  x,
                  y: getLatencyValue({
                    latencyAggregationType,
                    aggregation: timeseriesBucket.latency,
                  }),
                },
              ],
            },
            throughput: {
              timeseries: [
                ...acc.throughput.timeseries,
                {
                  x,
                  y: timeseriesBucket.transaction_count.value / deltaAsMinutes,
                },
              ],
            },
            errorRate: {
              timeseries: [
                ...acc.errorRate.timeseries,
                {
                  x,
                  y:
                    timeseriesBucket.transaction_count.value > 0
                      ? (timeseriesBucket[EVENT_OUTCOME].transaction_count
                          .value ?? 0) /
                        timeseriesBucket.transaction_count.value
                      : null,
                },
              ],
            },
          };
        },
        {
          latency: { timeseries: [] as Coordinate[] },
          throughput: { timeseries: [] as Coordinate[] },
          errorRate: { timeseries: [] as Coordinate[] },
        }
      ),
    };
  }, {});
}
