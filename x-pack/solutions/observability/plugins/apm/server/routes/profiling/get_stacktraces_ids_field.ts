/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import {
  ELASTIC_PROFILER_STACK_TRACE_IDS,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_PROFILER_STACK_TRACE_IDS,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { maybe } from '../../../common/utils/maybe';

export async function getStacktracesIdsField({
  apmEventClient,
  start,
  end,
  environment,
  serviceName,
  transactionType,
  transactionName,
  kuery,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: string;
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  kuery?: string;
}) {
  const response = await apmEventClient.search('get_stacktraces_ids_field', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    size: 1,
    terminate_after: 1,
    track_total_hits: false,
    fields: [ELASTIC_PROFILER_STACK_TRACE_IDS, TRANSACTION_PROFILER_STACK_TRACE_IDS],
    _source: false,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termQuery(SERVICE_NAME, serviceName),
          ...termQuery(TRANSACTION_TYPE, transactionType),
          ...termQuery(TRANSACTION_NAME, transactionName),
          ...kqlQuery(kuery),
          ...environmentQuery(environment),
        ],
        should: [
          { exists: { field: ELASTIC_PROFILER_STACK_TRACE_IDS } },
          { exists: { field: TRANSACTION_PROFILER_STACK_TRACE_IDS } },
        ],
      },
    },
  });

  const fields = maybe(response.hits.hits[0])?.fields;

  const field =
    fields &&
    accessKnownApmEventFields(fields).requireFields([ELASTIC_PROFILER_STACK_TRACE_IDS])[
      ELASTIC_PROFILER_STACK_TRACE_IDS
    ];

  if (field?.length) {
    return ELASTIC_PROFILER_STACK_TRACE_IDS;
  }

  return TRANSACTION_PROFILER_STACK_TRACE_IDS;
}
