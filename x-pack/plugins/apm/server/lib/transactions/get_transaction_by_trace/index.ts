/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  PARENT_ID,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { withApmSpan } from '../../../utils/with_apm_span';

export function getRootTransactionByTraceId(traceId: string, setup: Setup) {
  return withApmSpan('get_root_transaction_by_trace_id', async () => {
    const { apmEventClient } = setup;

    const params = {
      apm: {
        events: [ProcessorEvent.transaction as const],
      },
      body: {
        size: 1,
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
            filter: [{ term: { [TRACE_ID]: traceId } }],
          },
        },
      },
    };

    const resp = await apmEventClient.search(params);
    return {
      transaction: resp.hits.hits[0]?._source,
    };
  });
}
