/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import {
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_ROOT,
  PARENT_ID,
} from '../../../../common/es_fields/apm';
import { APMConfig } from '../../..';
import { APMEventClient } from '../create_es_client/create_apm_event_client';

export async function getHasTransactionsEvents({
  start,
  end,
  apmEventClient,
  kuery,
}: {
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery: string;
}) {
  const response = await apmEventClient.search(
    'get_has_aggregated_transactions',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        track_total_hits: 1,
        terminate_after: 1,
        size: 0,
        query: {
          bool: {
            filter: [
              { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
              ...(start && end ? rangeQuery(start, end) : []),
              ...kqlQuery(kuery),
            ],
          },
        },
      },
    }
  );

  return response.hits.total.value > 0;
}

export async function getSearchTransactionsEvents({
  config,
  start,
  end,
  apmEventClient,
  kuery,
}: {
  config: APMConfig;
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery: string;
}): Promise<boolean> {
  switch (config.searchAggregatedTransactions) {
    case SearchAggregatedTransactionSetting.always:
      return kuery
        ? getHasTransactionsEvents({ start, end, apmEventClient, kuery })
        : true;

    case SearchAggregatedTransactionSetting.auto:
      return getHasTransactionsEvents({
        start,
        end,
        apmEventClient,
        kuery,
      });

    case SearchAggregatedTransactionSetting.never:
      return false;
  }
}

export function getDurationFieldForTransactions(
  searchAggregatedTransactions: boolean
) {
  return searchAggregatedTransactions
    ? TRANSACTION_DURATION_HISTOGRAM
    : TRANSACTION_DURATION;
}

export function getDocumentTypeFilterForTransactions(
  searchAggregatedTransactions: boolean
) {
  return searchAggregatedTransactions
    ? [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }]
    : [];
}

export function getProcessorEventForTransactions(
  searchAggregatedTransactions: boolean
): ProcessorEvent.metric | ProcessorEvent.transaction {
  return searchAggregatedTransactions
    ? ProcessorEvent.metric
    : ProcessorEvent.transaction;
}

export function isRootTransaction(searchAggregatedTransactions: boolean) {
  return searchAggregatedTransactions
    ? {
        term: {
          [TRANSACTION_ROOT]: true,
        },
      }
    : {
        bool: {
          must_not: {
            exists: { field: PARENT_ID },
          },
        },
      };
}
