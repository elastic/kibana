/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { rangeRt } from './default_api_types';
import { getCorrelationsForSlowTransactions } from '../lib/transaction_groups/correlations/get_correlations_for_slow_transactions';
import { getCorrelationsForRanges } from '../lib/transaction_groups/correlations/get_correlations_for_ranges';
import { scoringRt } from '../lib/transaction_groups/correlations/scoring_rt';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';

export const correlationsForSlowTransactionsRoute = createRoute({
  endpoint: 'GET /api/apm/correlations/slow_durations',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
        scoring: scoringRt,
      }),
      t.type({
        durationPercentile: t.string,
        fieldNames: t.string,
      }),
      t.partial({ uiFilters: t.string }),
      rangeRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const {
      serviceName,
      transactionType,
      transactionName,
      durationPercentile,
      fieldNames,
      scoring = 'percentage',
    } = context.params.query;

    return getCorrelationsForSlowTransactions({
      serviceName,
      transactionType,
      transactionName,
      durationPercentile: parseInt(durationPercentile, 10),
      fieldNames: fieldNames.split(','),
      scoring,
      setup,
    });
  },
});

export const correlationsForRangesRoute = createRoute({
  endpoint: 'GET /api/apm/correlations/ranges',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
        scoring: scoringRt,
        gap: t.string,
      }),
      t.type({
        fieldNames: t.string,
      }),
      t.partial({ uiFilters: t.string }),
      rangeRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      serviceName,
      transactionType,
      transactionName,
      scoring = 'percentage',
      gap,
      fieldNames,
    } = context.params.query;

    const gapBetweenRanges = parseInt(gap || '0', 10) * 3600 * 1000;
    if (gapBetweenRanges < 0) {
      throw new Error('gap must be 0 or positive');
    }

    return getCorrelationsForRanges({
      serviceName,
      transactionType,
      transactionName,
      scoring,
      gapBetweenRanges,
      fieldNames: fieldNames.split(','),
      setup,
    });
  },
});
