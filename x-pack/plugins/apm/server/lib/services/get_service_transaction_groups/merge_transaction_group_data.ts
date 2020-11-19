/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';

import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';

import { TransactionGroupTimeseriesData } from './get_timeseries_data_for_transaction_groups';

import { TransactionGroupWithoutTimeseriesData } from './get_transaction_groups_for_page';

export function mergeTransactionGroupData({
  start,
  end,
  transactionGroups,
  timeseriesData,
}: {
  start: number;
  end: number;
  transactionGroups: TransactionGroupWithoutTimeseriesData[];
  timeseriesData: TransactionGroupTimeseriesData;
}) {
  const deltaAsMinutes = (end - start) / 1000 / 60;

  return transactionGroups.map((transactionGroup) => {
    const groupBucket = timeseriesData.find(
      ({ key }) => key === transactionGroup.name
    );

    const transactionTypes =
      groupBucket?.transaction_types.buckets.map(
        (bucket) => bucket.key as string
      ) ?? [];

    const transactionType =
      transactionTypes.find(
        (type) => type === TRANSACTION_PAGE_LOAD || type === TRANSACTION_REQUEST
      ) ?? transactionTypes[0];

    const timeseriesBuckets = groupBucket?.timeseries.buckets ?? [];

    return timeseriesBuckets.reduce(
      (prev, point) => {
        return {
          ...prev,
          latency: {
            ...prev.latency,
            timeseries: prev.latency.timeseries.concat({
              x: point.key,
              y: point.avg_latency.value,
            }),
          },
          traffic: {
            ...prev.traffic,
            timeseries: prev.traffic.timeseries.concat({
              x: point.key,
              y: point.transaction_count.value / deltaAsMinutes,
            }),
          },
          errorRate: {
            ...prev.errorRate,
            timeseries: prev.errorRate.timeseries.concat({
              x: point.key,
              y:
                point.transaction_count.value > 0
                  ? (point[EVENT_OUTCOME].transaction_count.value ?? 0) /
                    point.transaction_count.value
                  : null,
            }),
          },
        };
      },
      {
        name: transactionGroup.name,
        transactionType,
        latency: {
          value: transactionGroup.latency,
          timeseries: [] as Array<{ x: number; y: number | null }>,
        },
        traffic: {
          value: transactionGroup.traffic,
          timeseries: [] as Array<{ x: number; y: number }>,
        },
        errorRate: {
          value: transactionGroup.errorRate,
          timeseries: [] as Array<{ x: number; y: number | null }>,
        },
        impact: transactionGroup.impact,
      }
    );
  });
}
