/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getTimeseriesDataForTransactionGroups } from './get_timeseries_data_for_transaction_groups';
import {
  getTransactionGroupsForPage,
  ServiceOverviewTransactionGroupSortField,
} from './get_transaction_groups_for_page';
import { mergeTransactionGroupData } from './merge_transaction_group_data';

export async function getServiceTransactionGroups({
  serviceName,
  setup,
  size,
  numBuckets,
  pageIndex,
  sortDirection,
  sortField,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  size: number;
  pageIndex: number;
  numBuckets: number;
  sortDirection: 'asc' | 'desc';
  sortField: ServiceOverviewTransactionGroupSortField;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}) {
  const { apmEventClient, start, end, esFilter } = setup;

  const {
    transactionGroups,
    totalTransactionGroups,
    isAggregationAccurate,
  } = await getTransactionGroupsForPage({
    apmEventClient,
    start,
    end,
    serviceName,
    esFilter,
    pageIndex,
    sortField,
    sortDirection,
    size,
    searchAggregatedTransactions,
    transactionType,
    latencyAggregationType,
  });

  const transactionNames = transactionGroups.map((group) => group.name);

  const timeseriesData = await getTimeseriesDataForTransactionGroups({
    apmEventClient,
    start,
    end,
    esFilter,
    numBuckets,
    searchAggregatedTransactions,
    serviceName,
    size,
    transactionNames,
    transactionType,
    latencyAggregationType,
  });

  return {
    transactionGroups: mergeTransactionGroupData({
      transactionGroups,
      timeseriesData,
      start,
      end,
      latencyAggregationType,
    }),
    totalTransactionGroups,
    isAggregationAccurate,
  };
}
