/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { transactionMapping } from '../../../utils/es_fields_mappings';
import {
  AGENT_NAME,
  AGENT_VERSION,
  DATA_STEAM_TYPE,
  DATA_STREAM_DATASET,
  DATA_STREAM_NAMESPACE,
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  LABEL_SOME_RESOURCE_ATTRIBUTE,
  OBSERVER_HOSTNAME,
  OBSERVER_TYPE,
  OBSERVER_VERSION,
  PROCESSOR_EVENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
  SPAN_ID,
  AT_TIMESTAMP,
  TRANSACTION_REPRESENTATIVE_COUNT,
} from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';

export async function getTransaction({
  transactionId,
  traceId,
  apmEventClient,
  start,
  end,
}: {
  transactionId: string;
  traceId?: string;
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
            { term: { [TRANSACTION_ID]: transactionId } },
            ...termQuery(TRACE_ID, traceId),
            ...rangeQuery(start, end),
          ]),
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
        SERVICE_NAME,
        SERVICE_FRAMEWORK_NAME,
        TRACE_ID,
        AGENT_NAME,
        AGENT_VERSION,
        EVENT_SUCCESS_COUNT,
        EVENT_OUTCOME,
        PROCESSOR_EVENT,
        DATA_STREAM_NAMESPACE,
        DATA_STEAM_TYPE,
        DATA_STREAM_DATASET,
        SPAN_ID,
        OBSERVER_HOSTNAME,
        OBSERVER_TYPE,
        OBSERVER_VERSION,
        TIMESTAMP,
        AT_TIMESTAMP,
        LABEL_SOME_RESOURCE_ATTRIBUTE,
      ],
    },
  });

  return transactionMapping(resp.hits.hits[0]?.fields);
}
