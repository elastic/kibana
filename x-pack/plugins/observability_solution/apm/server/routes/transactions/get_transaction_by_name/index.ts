/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { maybe } from '../../../../common/utils/maybe';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  AT_TIMESTAMP,
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { TransactionDetailRedirectInfo } from '../get_transaction_by_trace';

export async function getTransactionByName({
  transactionName,
  serviceName,
  apmEventClient,
  start,
  end,
}: {
  transactionName: string;
  serviceName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<TransactionDetailRedirectInfo | undefined> {
  const requiredFields = asMutableArray([
    AT_TIMESTAMP,
    TRACE_ID,
    TRANSACTION_ID,
    TRANSACTION_TYPE,
    TRANSACTION_NAME,
    TRANSACTION_DURATION,
    SERVICE_NAME,
  ] as const);

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
            { term: { [TRANSACTION_NAME]: transactionName } },
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
          ]),
        },
      },
      fields: requiredFields,
    },
  });

  return unflattenKnownApmEventFields(maybe(resp.hits.hits[0])?.fields, requiredFields);
}
