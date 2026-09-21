/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { termQuery, kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  DEVICE_MODEL_IDENTIFIER,
  ERROR_TYPE,
  HOST_OS_VERSION,
  SERVICE_NAME,
  SERVICE_VERSION,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { MobileFilterErrorType } from './get_mobile_filters';

export async function getDeviceOSApp({
  kuery,
  apmEventClient,
  serviceName,
  transactionType,
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
  // everything else), rather than from transaction documents.
  const errorTypeFilter: QueryDslQueryContainer[] =
    errorType === 'crash'
      ? termQuery(ERROR_TYPE, 'crash')
      : errorType === 'error'
      ? [{ bool: { must_not: termQuery(ERROR_TYPE, 'crash') } }]
      : [];

  return await apmEventClient.search('get_mobile_device_os_app', {
    apm: errorType
      ? {
          events: [ProcessorEvent.error],
        }
      : {
          sources: [
            {
              documentType: ApmDocumentType.TransactionEvent,
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
          ...termQuery(TRANSACTION_TYPE, transactionType),
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          ...errorTypeFilter,
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      devices: {
        terms: {
          field: DEVICE_MODEL_IDENTIFIER,
          size,
        },
      },
      osVersions: {
        terms: {
          field: HOST_OS_VERSION,
          size,
        },
      },
      appVersions: {
        terms: {
          field: SERVICE_VERSION,
          size,
        },
      },
    },
  });
}
