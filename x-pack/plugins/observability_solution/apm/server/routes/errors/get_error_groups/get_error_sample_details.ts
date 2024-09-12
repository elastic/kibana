/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { normalizeFields } from '../../../utils/normalize_fields';
import { ERROR_ID, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getTransaction } from '../../transactions/get_transaction';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';

export interface ErrorSampleDetailsResponse {
  transaction: Transaction | undefined;
  error: APMError;
}

export async function getErrorSampleDetails({
  environment,
  kuery,
  serviceName,
  errorId,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  errorId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ErrorSampleDetailsResponse> {
  const params = {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent as const,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [ERROR_ID]: errorId } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
    },
    fields: ['*'],
  };

  const resp = await apmEventClient.search('get_error_sample_details', params);
  // const error = resp.hits.hits[0]?._source;

  const error = resp.hits.hits[0]?.fields;
  const errorNorm = normalizeFields(error);
  const transactionId = errorNorm?.transaction?.id;
  const traceId = errorNorm?.trace?.id;

  let transaction;
  if (transactionId && traceId) {
    transaction = await getTransaction({
      transactionId,
      traceId,
      apmEventClient,
      start,
      end,
    });
  }

  return {
    transaction,
    error: errorNorm,
  };
}
