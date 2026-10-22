/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { MobileErrorType } from '@kbn/apm-types';
import {
  DEVICE_MODEL_IDENTIFIER,
  HOST_OS_VERSION,
  SERVICE_NAME,
  SERVICE_VERSION,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { mobileErrorTypeQuery } from './mobile_error_type_query';

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
  errorType?: MobileErrorType;
  environment: string;
  start: number;
  end: number;
  size: number;
}) {
  return await apmEventClient.search('get_mobile_device_os_app', {
    apm: {
      sources: [
        {
          documentType: errorType ? ApmDocumentType.ErrorEvent : ApmDocumentType.TransactionEvent,
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
          // The transactionType filter is only relevant for transaction documents;
          // error documents are scoped by error.type instead.
          ...(errorType
            ? mobileErrorTypeQuery(errorType)
            : termQuery(TRANSACTION_TYPE, transactionType)),
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
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
