/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { normalizeFields } from '../../../utils/normalize_fields';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_ID,
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
}) {
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
    },
    fields: ['*'],
  });

  const fields = resp.hits.hits[0]?.fields;
  const fieldsNorm = normalizeFields(fields);

  return fieldsNorm;
}

// function normalizeFields(fields: Partial<Record<string, unknown[]>>): Record<string, unknown> {
//   const normalizedFields: Record<string, unknown> = {};

//   for (const [key, value] of Object.entries(fields)) {
//     const normalizedValue = Array.isArray(value) && value.length > 0 ? value[0] : value;

//     set(normalizedFields, key, normalizedValue);
//   }
//   return normalizedFields;
// }
