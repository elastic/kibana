/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { termQuery, kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ERROR_TYPE, NETWORK_CONNECTION_TYPE, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MobileFilterErrorType } from './get_mobile_filters';

export async function getNCT({
  kuery,
  apmEventClient,
  serviceName,
  errorType,
  environment,
  start,
  end,
  size,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType?: string;
  errorType?: MobileFilterErrorType;
  environment: string;
  start: number;
  end: number;
  size: number;
}) {
  // On the errors & crashes tabs the dropdown options must be sourced from the
  // matching error documents (crashes only show `error.type: crash`, errors show
  // everything else), rather than from span documents.
  const errorTypeFilter: QueryDslQueryContainer[] =
    errorType === 'crash'
      ? termQuery(ERROR_TYPE, 'crash')
      : errorType === 'error'
      ? [{ bool: { must_not: termQuery(ERROR_TYPE, 'crash') } }]
      : [];

  return await apmEventClient.search('get_mobile_nct', {
    apm: errorType
      ? {
          events: [ProcessorEvent.error],
        }
      : {
          sources: [
            {
              documentType: ApmDocumentType.SpanEvent,
              rollupInterval: RollupInterval.None,
            },
          ],
        },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...termQuery(SERVICE_NAME, serviceName),
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          ...errorTypeFilter,
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      netConnectionTypes: {
        terms: {
          field: NETWORK_CONNECTION_TYPE,
          size,
        },
      },
    },
  });
}
