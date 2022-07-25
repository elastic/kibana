/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
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
        size: 1,
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
      terminate_after: 1,
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
  switch (config.searchAggregatedTransactions) {
    case SearchAggregatedTransactionSetting.always:
      return kuery
        ? getHasAggregatedTransactions({ start, end, apmEventClient, kuery })
        : true;

    case SearchAggregatedTransactionSetting.auto:
      return getHasAggregatedTransactions({
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
