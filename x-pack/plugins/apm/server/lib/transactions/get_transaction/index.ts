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
import { rangeQuery } from '../../../../common/utils/queries';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { withApmSpan } from '../../../utils/with_apm_span';

export function getTransaction({
  transactionId,
  traceId,
  setup,
}: {
  transactionId: string;
  traceId: string;
  setup: Setup & SetupTimeRange;
}) {
  return withApmSpan('get_transaction', async () => {
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
              ...rangeQuery(start, end),
            ],
          },
        },
      },
    });

    return resp.hits.hits[0]?._source;
  });
}
