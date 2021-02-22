/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import { rangeQuery } from '../../../../common/utils/queries';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/elasticsearch_fieldnames';
import { APMConfig } from '../../..';
import { APMEventClient } from '../create_es_client/create_apm_event_client';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function getHasAggregatedTransactions({
  start,
  end,
  apmEventClient,
}: {
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
}) {
  return withApmSpan('get_has_aggregated_transactions', async () => {
    const response = await apmEventClient.search({
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        query: {
          bool: {
            filter: [
              { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
              ...(start && end ? rangeQuery(start, end) : []),
            ],
          },
        },
      },
      terminateAfter: 1,
    });

    if (response.hits.total.value > 0) {
      return true;
    }

    return false;
  });
}

export async function getSearchAggregatedTransactions({
  config,
  start,
  end,
  apmEventClient,
}: {
  config: APMConfig;
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
}): Promise<boolean> {
  const searchAggregatedTransactions =
    config['xpack.apm.searchAggregatedTransactions'];

  if (
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.auto
  ) {
    return getHasAggregatedTransactions({ start, end, apmEventClient });
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
