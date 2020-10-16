/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import { Setup, SetupTimeRange } from '../../server/lib/helpers/setup_request';
import {
  TRANSACTION_NAME,
  PARENT_ID,
  TRANSACTION_ROOT,
} from '../../common/elasticsearch_fieldnames';
import { Options } from '../../server/lib/transaction_groups/fetcher';
import { getTransactionsProjection } from './transactions';
import { mergeProjection } from './util/merge_projection';

export function getTransactionGroupsProjection({
  setup,
  options,
}: {
  setup: Setup & SetupTimeRange;
  options: Options;
}) {
  const transactionsProjection = getTransactionsProjection({
    setup,
    ...(omit(options, 'type') as Omit<typeof options, 'type'>),
  });

  if (options.type === 'top_traces') {
    if (options.searchAggregatedTransactions) {
      transactionsProjection.body.query.bool.filter.push({
        term: {
          [TRANSACTION_ROOT]: true,
        },
      });
    } else {
      // @ts-expect-error: Property 'must_not' does not exist on type '{ filter: ESFilter[]; }'.
      transactionsProjection.body.query.bool.must_not = [
        {
          exists: {
            field: PARENT_ID,
          },
        },
      ];
    }
  }

  return mergeProjection(transactionsProjection, {
    body: {
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_NAME,
          },
        },
      },
    },
  });
}
