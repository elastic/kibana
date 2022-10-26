/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../../common/elasticsearch_fieldnames';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTransaction({
  transactionId,
  traceId,
  apmEventClient,
  start,
  end,
}: {
  transactionId: string;
  traceId?: string;
  apmEventClient: APMEventClient;
  start?: number;
  end?: number;
}) {
  const resp = await apmEventClient.search('get_transaction', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: asMutableArray([
            { term: { [TRANSACTION_ID]: transactionId } },
            ...termQuery(TRACE_ID, traceId),
            ...(start && end ? rangeQuery(start, end) : []),
          ]),
        },
      },
    },
  });

  return resp.hits.hits[0]?._source;
}
