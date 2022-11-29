/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { APMConfig } from '../..';
import {
  ERROR,
  ERROR_LOG_LEVEL,
  PARENT_ID,
  SERVICE_NAME,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import { WaterfallErrorDoc } from '../../../common/watefall';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getErrorDocs(
  traceId: string,
  config: APMConfig,
  apmEventClient: APMEventClient,
  start: number,
  end: number
): Promise<WaterfallErrorDoc[]> {
  const maxTraceItems = config.ui.maxTraceItems;
  const excludedLogLevels = ['debug', 'info', 'warning'];

  const errorResponse = await apmEventClient.search('get_error_docs', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      _source: [
        TRACE_ID,
        TRANSACTION_ID,
        PARENT_ID,
        ERROR,
        SERVICE_NAME,
        TIMESTAMP,
      ],
      track_total_hits: false,
      size: maxTraceItems,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            ...rangeQuery(start, end),
          ],
          must_not: { terms: { [ERROR_LOG_LEVEL]: excludedLogLevels } },
        },
      },
    },
  });

  return errorResponse.hits.hits.map(
    (hit): WaterfallErrorDoc => ({
      timestamp: { us: new Date(hit._source[TIMESTAMP]).getTime() * 1000 },
      trace: {
        id: hit._source.trace?.id,
      },
      transaction: {
        id: hit._source.transaction?.id,
      },
      parent: { id: hit._source.parent?.id },
      service: { name: hit._source.service.name },
      error: hit._source.error,
    })
  );
}
