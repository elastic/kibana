/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ESClient } from '../get_es_client';
import {
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../../common/elasticsearch_fieldnames';

async function determinePreferenceBasedOnData({
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
    return ProcessorEvent.metric;
  }

  return ProcessorEvent.transaction;
}

export async function getTransactionDurationSearchStrategy({
  preference,
  start,
  end,
  client,
}: {
  preference?: ProcessorEvent.metric | ProcessorEvent.transaction | undefined;
  start: number;
  end: number;
  client: ESClient;
}): Promise<TransactionDurationSearchStrategy> {
  const type: ProcessorEvent = preference
    ? preference
    : await determinePreferenceBasedOnData({ start, end, client });

  if (type === ProcessorEvent.metric) {
    return {
      type,
      transactionDurationField: TRANSACTION_DURATION_HISTOGRAM,
      documentTypeFilter: [
        { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
      ],
    };
  }

  return {
    type,
    transactionDurationField: TRANSACTION_DURATION,
    documentTypeFilter: [],
  };
}

export interface TransactionDurationSearchStrategy {
  type: ProcessorEvent;
  transactionDurationField: string;
  documentTypeFilter: ESFilter[];
}
