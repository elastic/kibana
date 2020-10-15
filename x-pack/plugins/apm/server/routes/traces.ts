/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTrace } from '../lib/traces/get_trace';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { bucketSizeUnitRt } from '../../common/runtime_types/bucket_size_unit_rt';

export const tracesRoute = createRoute(() => ({
  path: '/api/apm/traces',
  params: {
    query: t.intersection([
      rangeRt,
      uiFiltersRt,
      t.type({ unit: bucketSizeUnitRt }),
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const { unit } = context.params.query;

    return getTransactionGroupList({
      options: { type: 'top_traces', searchAggregatedTransactions },
      setup,
      unit,
    });
  },
}));

export const tracesByIdRoute = createRoute(() => ({
  path: '/api/apm/traces/{traceId}',
  params: {
    path: t.type({
      traceId: t.string,
    }),
    query: rangeRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return getTrace(context.params.path.traceId, setup);
  },
}));
