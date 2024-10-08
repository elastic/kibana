/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { Transaction } from '@kbn/apm-types';
import { maybe } from '../../../../common/utils/maybe';
import {
  AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TIMESTAMP_US,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
  AT_TIMESTAMP,
  PROCESSOR_NAME,
  SPAN_LINKS,
  TRANSACTION_AGENT_MARKS,
  SERVICE_LANGUAGE_NAME,
} from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';

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
  start: number;
  end: number;
}): Promise<Transaction | undefined> {
  const requiredFields = asMutableArray([
    TRACE_ID,
    AGENT_NAME,
    PROCESSOR_EVENT,
    AT_TIMESTAMP,
    TIMESTAMP_US,
    SERVICE_NAME,
    TRANSACTION_ID,
    TRANSACTION_DURATION,
    TRANSACTION_NAME,
    TRANSACTION_SAMPLED,
    TRANSACTION_TYPE,
  ] as const);

  const optionalFields = asMutableArray([PROCESSOR_NAME, SERVICE_LANGUAGE_NAME] as const);

  const resp = await apmEventClient.search('get_transaction', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: asMutableArray([
            { term: { [TRANSACTION_ID]: transactionId } },
            ...termQuery(TRACE_ID, traceId),
            ...rangeQuery(start, end),
          ]),
        },
      },
      fields: [...requiredFields, ...optionalFields],
      _source: [SPAN_LINKS, TRANSACTION_AGENT_MARKS],
    },
  });

  const hit = maybe(resp.hits.hits[0]);

  if (!hit) {
    return undefined;
  }

  const event = unflattenKnownApmEventFields(hit.fields, requiredFields);

  const source =
    'span' in hit._source && 'transaction' in hit._source
      ? (hit._source as {
          transaction: Pick<Required<Transaction>['transaction'], 'marks'>;
          span?: Pick<Required<Transaction>['span'], 'links'>;
        })
      : undefined;

  return {
    ...event,
    transaction: {
      ...event.transaction,
      marks: source?.transaction.marks,
    },
    processor: {
      name: 'transaction',
      event: 'transaction',
    },
    span: source?.span,
  };
}
