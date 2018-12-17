/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransactionAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/get_transaction';
import { SpanListAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/spans/get_spans';
import { Span } from 'x-pack/plugins/apm/typings/es_schemas/Span';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { addVersion, getEncodedEsQuery } from './apm';

export async function loadSpans({
  serviceName,
  start,
  end,
  transactionId
}: IUrlParams) {
  const hits = await callApi<SpanListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}/spans`,
    query: {
      start,
      end
    }
  });

  return hits.map(addVersion).map(addSpanId);
}

function addSpanId(hit: Span, i: number) {
  if (!hit.span.id) {
    hit.span.id = i;
  }
  return hit;
}

export async function loadTransaction({
  serviceName,
  start,
  end,
  transactionId,
  traceId,
  kuery
}: IUrlParams) {
  const result = await callApi<TransactionAPIResponse>(
    {
      pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}`,
      query: {
        traceId,
        start,
        end,
        esFilterQuery: await getEncodedEsQuery(kuery)
      }
    },
    {
      camelcase: false
    }
  );

  return addVersion(result);
}
