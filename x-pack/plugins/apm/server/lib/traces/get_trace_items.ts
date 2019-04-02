/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  TRACE_ID
} from 'x-pack/plugins/apm/common/elasticsearch_fieldnames';
import { Span } from '../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../typings/es_schemas/ui/Transaction';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export type TraceItem = Transaction | Span;

export async function getTraceItems(
  traceId: string,
  setup: Setup
): Promise<TraceItem[]> {
  const { start, end, client, config } = setup;

  const params: SearchParams = {
    index: [
      config.get('apm_oss.spanIndices'),
      config.get('apm_oss.transactionIndices')
    ],
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { terms: { [PROCESSOR_EVENT]: ['span', 'transaction'] } },
            { range: rangeFilter(start, end) }
          ]
        }
      }
    }
  };

  const resp = await client<TraceItem>('search', params);
  return resp.hits.hits.map(hit => hit._source);
}
