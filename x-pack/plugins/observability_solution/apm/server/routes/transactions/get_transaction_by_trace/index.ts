/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  TRACE_ID,
  PARENT_ID,
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  DATA_STEAM_TYPE,
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  OBSERVER_HOSTNAME,
  OBSERVER_TYPE,
  OBSERVER_VERSION,
  PROCESSOR_EVENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SPAN_ID,
  TIMESTAMP,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_REPRESENTATIVE_COUNT,
  TRANSACTION_RESULT,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
  LABEL_GC,
  LABEL_LIFECYCLE_STATE,
  LABEL_NAME,
  LABEL_TELEMETRY_AUTO_VERSION,
  LABEL_TYPE,
  OBSERVER_VERSION_MAJOR,
  PROCESSOR_NAME,
} from '../../../../common/es_fields/apm';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { transactionMapping } from '../../../utils/es_fields_mappings';

export async function getRootTransactionByTraceId({
  traceId,
  apmEventClient,
  start,
  end,
}: {
  traceId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  const params = {
    apm: {
      events: [ProcessorEvent.transaction as const],
    },
    body: {
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          should: [
            {
              constant_score: {
                filter: {
                  bool: {
                    must_not: { exists: { field: PARENT_ID } },
                  },
                },
              },
            },
          ],
          filter: [{ term: { [TRACE_ID]: traceId } }, ...rangeQuery(start, end)],
        },
      },
      fields: [
        TRANSACTION_REPRESENTATIVE_COUNT,
        TRANSACTION_RESULT,
        TRANSACTION_SAMPLED,
        TRANSACTION_ID,
        TRANSACTION_DURATION,
        TRANSACTION_TYPE,
        TRANSACTION_NAME,
        SERVICE_NODE_NAME,
        SERVICE_NODE_NAME,
        SERVICE_NAME,
        SERVICE_FRAMEWORK_NAME,
        TRACE_ID,
        AGENT_NAME,
        AGENT_VERSION,
        EVENT_SUCCESS_COUNT,
        EVENT_OUTCOME,
        PROCESSOR_EVENT,
        PROCESSOR_NAME,
        DATA_STREAM_NAMESPACE,
        DATA_STEAM_TYPE,
        DATA_STREAM_DATASET,
        SPAN_ID,
        OBSERVER_HOSTNAME,
        OBSERVER_TYPE,
        OBSERVER_VERSION,
        OBSERVER_VERSION_MAJOR,
        TIMESTAMP,
        AT_TIMESTAMP,
        LABEL_NAME,
        LABEL_GC,
        LABEL_TYPE,
        LABEL_TELEMETRY_AUTO_VERSION,
        LABEL_LIFECYCLE_STATE,
      ],
    },
  };

  const resp = await apmEventClient.search('get_root_transaction_by_trace_id', params);

  return transactionMapping(resp.hits.hits[0]?.fields);
}
