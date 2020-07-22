/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  TRACE_ID,
  PARENT_ID,
} from '../../../../common/elasticsearch_fieldnames';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { Setup } from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';

export async function getRootTransactionByTraceId(
  traceId: string,
  setup: Setup
) {
  const { client, indices } = setup;
  const params = {
    index: indices['apm_oss.transactionIndices'],
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
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
          ],
        },
      },
    },
  };

  const resp = await client.search<Transaction>(params);
  return {
    transaction: resp.hits.hits[0]?._source,
  };
}
