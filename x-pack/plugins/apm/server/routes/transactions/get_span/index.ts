/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SPAN_ID, TRACE_ID } from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getTransaction } from '../get_transaction';
import { Span } from '../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';

export async function getSpan({
  spanId,
  traceId,
  parentTransactionId,
  apmEventClient,
  start,
  end,
}: {
  spanId: string;
  traceId: string;
  parentTransactionId?: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<{ span?: Span; parentTransaction?: Transaction }> {
  const [spanResp, parentTransaction] = await Promise.all([
    apmEventClient.search('get_span', {
      apm: {
        events: [ProcessorEvent.span],
      },
      body: {
        track_total_hits: false,
        size: 1,
        terminate_after: 1,
        query: {
          bool: {
            filter: asMutableArray([
              { term: { [SPAN_ID]: spanId } },
              ...termQuery(TRACE_ID, traceId),
              ...rangeQuery(start, end),
            ]),
          },
        },
      },
    }),
    parentTransactionId
      ? getTransaction({
          apmEventClient,
          transactionId: parentTransactionId,
          traceId,
          start,
          end,
        })
      : undefined,
  ]);

  return { span: spanResp.hits.hits[0]?._source, parentTransaction };
}
