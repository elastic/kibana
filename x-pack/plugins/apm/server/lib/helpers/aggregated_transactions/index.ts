/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/elasticsearch_fieldnames';
import { APMConfig } from '../../..';
import { APMEventClient } from '../create_es_client/create_apm_event_client';

export async function getHasAggregatedTransactions({
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
      terminateAfter: 1,
    }
  );

  return response.hits.total.value > 0;
}

export async function getSearchAggregatedTransactions({
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
  const searchAggregatedTransactions =
    config['xpack.apm.searchAggregatedTransactions'];

  if (
    kuery ||
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.auto
  ) {
    return getHasAggregatedTransactions({ start, end, apmEventClient, kuery });
  }

  return (
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.always
  );
}

export function getTransactionDurationFieldForAggregatedTransactions(
  searchAggregatedTransactions: boolean
) {
  return searchAggregatedTransactions
    ? TRANSACTION_DURATION_HISTOGRAM
    : TRANSACTION_DURATION;
}

export function getDocumentTypeFilterForAggregatedTransactions(
  searchAggregatedTransactions: boolean
) {
  return searchAggregatedTransactions
    ? [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }]
    : [];
}

export function getProcessorEventForAggregatedTransactions(
  searchAggregatedTransactions: boolean
): ProcessorEvent.metric | ProcessorEvent.transaction {
  return searchAggregatedTransactions
    ? ProcessorEvent.metric
    : ProcessorEvent.transaction;
}
