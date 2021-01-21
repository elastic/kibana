/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import {
  getTransactionGroupsForPage,
  ServiceOverviewTransactionGroupSortField,
} from './get_transaction_groups_for_page';

export async function getServiceTransactionGroups({
  serviceName,
  setup,
  numBuckets,
  sortDirection,
  sortField,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
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
    sortField,
    sortDirection,
    searchAggregatedTransactions,
    transactionType,
    latencyAggregationType,
  });

  return {
    transactionGroups: transactionGroups.map((transactionGroup) => {
      return {
        name: transactionGroup.name,
        transactionType,
        latency: { value: transactionGroup.latency },
        throughput: { value: transactionGroup.throughput },
        errorRate: { value: transactionGroup.errorRate },
        impact: transactionGroup.impact,
      };
    }),
    totalTransactionGroups,
    isAggregationAccurate,
  };
}
