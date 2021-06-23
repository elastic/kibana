/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../server/utils/queries';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';

export async function getTransaction({
  transactionId,
  traceId,
  setup,
}: {
  transactionId: string;
  traceId?: string;
  setup: Setup | (Setup & SetupTimeRange);
}) {
  const { apmEventClient } = setup;

  const resp = await apmEventClient.search('get_transaction', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: asMutableArray([
            { term: { [TRANSACTION_ID]: transactionId } },
            ...(traceId ? [{ term: { [TRACE_ID]: traceId } }] : []),
            ...('start' in setup ? rangeQuery(setup.start, setup.end) : []),
          ]),
        },
      },
    },
  });

  return resp.hits.hits[0]?._source;
}
