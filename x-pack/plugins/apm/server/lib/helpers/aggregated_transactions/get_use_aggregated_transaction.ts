/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rangeFilter } from '../../../../common/utils/range_filter';
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
}: {
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
}) {
  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      query: {
        bool: {
          filter: [
            { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
            ...(start && end ? [{ range: rangeFilter(start, end) }] : []),
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
}

export async function getUseAggregatedTransactions({
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
  return config['xpack.apm.useAggregatedTransactions']
    ? await getHasAggregatedTransactions({ start, end, apmEventClient })
    : false;
}

export function getTransactionDurationFieldForAggregatedTransactions(
  useAggregatedTransactions: boolean
) {
  return useAggregatedTransactions
    ? TRANSACTION_DURATION_HISTOGRAM
    : TRANSACTION_DURATION;
}

export function getDocumentTypeFilterForAggregatedTransactions(
  useAggregatedTransactions: boolean
) {
  return useAggregatedTransactions
    ? [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }]
    : [];
}

export function getProcessorEventForAggregatedTransactions(
  useAggregatedTransactions: boolean
): ProcessorEvent.metric | ProcessorEvent.transaction {
  return useAggregatedTransactions
    ? ProcessorEvent.metric
    : ProcessorEvent.transaction;
}
