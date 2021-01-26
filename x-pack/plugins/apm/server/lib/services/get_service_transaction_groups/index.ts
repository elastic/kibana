/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getTransactionGroups } from './get_transaction_groups';

export async function getServiceTransactionGroups({
  serviceName,
  setup,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}) {
  const { apmEventClient, start, end, esFilter } = setup;

  const {
    transactionGroups,
    isAggregationAccurate,
  } = await getTransactionGroups({
    apmEventClient,
    start,
    end,
    serviceName,
    esFilter,
    searchAggregatedTransactions,
    transactionType,
    latencyAggregationType,
  });

  return {
    transactionGroups: transactionGroups.map((transactionGroup) => ({
      ...transactionGroup,
      transactionType,
    })),
    isAggregationAccurate,
  };
}
