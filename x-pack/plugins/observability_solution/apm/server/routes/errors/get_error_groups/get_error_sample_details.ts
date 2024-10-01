/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import {
  isElasticApmSource,
  unflattenKnownApmEventFields,
} from '@kbn/apm-data-access-plugin/server';
import { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/unflatten_known_fields';
import {
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  ERROR_GROUP_ID,
  ERROR_ID,
  PROCESSOR_EVENT,
  PROCESSOR_NAME,
  SERVICE_NAME,
  TIMESTAMP,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getTransaction } from '../../transactions/get_transaction';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { maybe } from '../../../../common/utils/maybe';

export interface ErrorSampleDetailsResponse {
  transaction: Transaction | undefined;
  error: Omit<APMError, 'transaction' | 'error'> & {
    transaction?: { id?: string; type?: string };
    error: {
      id: string;
    } & Omit<APMError['error'], 'exception' | 'log'> & {
        exception?: APMError['error']['exception'];
        log?: APMError['error']['log'];
      };
  };
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
}): Promise<Partial<ErrorSampleDetailsResponse>> {
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
      fields: ['*'],
      _source: ['error.exception', 'error.log'],
    },
  };

  const resp = await apmEventClient.search('get_error_sample_details', params);
  const hit = maybe(resp.hits.hits[0]);

  if (!hit) {
    return {
      transaction: undefined,
      error: undefined,
    };
  }

  const source = isElasticApmSource(hit._source)
    ? (hit._source as {
        error: { exception: APMError['error']['exception']; log: APMError['error']['log'] };
      })
    : undefined;

  const errorFromFields = unflattenKnownApmEventFields(
    hit.fields! as Partial<FlattenedApmEvent>,
    asMutableArray([
      AGENT_NAME,
      AGENT_VERSION,
      PROCESSOR_EVENT,
      PROCESSOR_NAME,
      TIMESTAMP,
      AT_TIMESTAMP,
      SERVICE_NAME,
      ERROR_ID,
      ERROR_GROUP_ID,
    ] as const)
  );

  const transactionId = errorFromFields?.transaction?.id;
  const traceId = errorFromFields?.trace?.id;

  let transaction: Transaction | undefined;
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
    error: {
      ...errorFromFields,
      processor: {
        event: errorFromFields.processor.event as 'error',
        name: errorFromFields.processor.name as 'error',
      },
      error: {
        ...errorFromFields.error,
        exception: source?.error.exception,
        log: source?.error.log,
      },
    },
  };
}
