/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { normalizeFields } from '../../../utils/normalize_fields';
import { ApmDocumentType } from '../../../../common/document_type';
import { SERVICE_NAME, TRANSACTION_NAME } from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

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
            { term: { [TRANSACTION_NAME]: transactionName } },
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
          ]),
        },
      },
    },
  });

  const fields = resp.hits.hits[0]?.fields;
  const fieldsNorm = normalizeFields(fields);

  return fieldsNorm;
}
