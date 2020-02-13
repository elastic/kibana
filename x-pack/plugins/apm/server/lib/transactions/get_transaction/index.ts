/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../common/elasticsearch_fieldnames';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { rangeFilter } from '../../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';

export async function getTransaction({
  transactionId,
  traceId,
  setup
}: {
  transactionId: string;
  traceId: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, client, indices } = setup;

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
            { term: { [TRANSACTION_ID]: transactionId } },
            { term: { [TRACE_ID]: traceId } },
            { range: rangeFilter(start, end) }
          ]
        }
      }
    }
  };

  const resp = await client.search<Transaction>(params);
  return resp.hits.hits[0]?._source;
}
