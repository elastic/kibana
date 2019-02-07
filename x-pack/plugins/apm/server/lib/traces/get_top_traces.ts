/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PARENT_ID,
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_SAMPLED
} from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../helpers/setup_request';
import { getTransactionGroups } from '../transaction_groups';
import { ITransactionGroup } from '../transaction_groups/transform';

export type TraceListAPIResponse = ITransactionGroup[];

export async function getTopTraces(
  setup: Setup
): Promise<TraceListAPIResponse> {
  const { start, end } = setup;

  const bodyQuery = {
    bool: {
      must: {
        // this criterion safeguards against data that lacks a transaction
        // parent ID but still is not a "trace" by way of not having a
        // trace ID (e.g. old data before parent ID was implemented, etc)
        exists: {
          field: TRACE_ID
        }
      },
      must_not: {
        // no parent ID alongside a trace ID means this transaction is a
        // "root" transaction, i.e. a trace
        exists: {
          field: PARENT_ID
        }
      },
      filter: [
        {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
              format: 'epoch_millis'
            }
          }
        },
        { term: { [PROCESSOR_EVENT]: 'transaction' } }
      ],
      should: [{ term: { [TRANSACTION_SAMPLED]: true } }]
    }
  };

  return getTransactionGroups(setup, bodyQuery);
}
