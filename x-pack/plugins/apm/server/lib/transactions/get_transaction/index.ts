/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';

export async function getTransaction({
  transactionId,
  traceId,
  setup,
}: {
  transactionId: string;
  traceId: string;
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, apmEventClient } = setup;

  const resp = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [TRANSACTION_ID]: transactionId } },
            { term: { [TRACE_ID]: traceId } },
            { range: rangeFilter(start, end) },
          ],
        },
      },
    },
  });

  return resp.hits.hits[0]?._source;
}
