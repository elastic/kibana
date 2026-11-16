/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { MobileErrorType } from '@kbn/apm-types';
import { NETWORK_CONNECTION_TYPE, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { mobileErrorTypeQuery } from './mobile_error_type_query';

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
  errorType?: MobileErrorType;
  environment: string;
  start: number;
  end: number;
  size: number;
}) {
  return await apmEventClient.search('get_mobile_nct', {
    apm: {
      sources: [
        {
          documentType: errorType ? ApmDocumentType.ErrorEvent : ApmDocumentType.SpanEvent,
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
          ...mobileErrorTypeQuery(errorType),
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
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
