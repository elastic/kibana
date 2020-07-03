/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ESClient } from '../get_es_client';
import {
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/elasticsearch_fieldnames';
import { APMConfig } from '../../..';

async function hasAggregatedTransactions({
  start,
  end,
  client,
}: {
  start: number;
  end: number;
  client: ESClient;
}) {
  const response = await client.search({
    apm: {
      types: [ProcessorEvent.metric],
    },
    body: {
      query: {
        bool: {
          filter: [
            { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
            { range: rangeFilter(start, end) },
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
  client,
}: {
  config: APMConfig;
  start: number;
  end: number;
  client: ESClient;
}): Promise<boolean> {
  return config['xpack.apm.useAggregatedTransactions']
    ? await hasAggregatedTransactions({ start, end, client })
    : false;
}

export function getTransactionDurationFieldForAggregatedTransactions(
  useMetrics: boolean
) {
  return useMetrics ? TRANSACTION_DURATION_HISTOGRAM : TRANSACTION_DURATION;
}

export function getDocumentTypeFilterForAggregatedTransactions(
  useMetrics: boolean
) {
  return useMetrics
    ? [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }]
    : [];
}

export function getProcessorEventForAggregatedTransactions(
  useMetrics: boolean
) {
  return useMetrics ? ProcessorEvent.metric : ProcessorEvent.transaction;
}
