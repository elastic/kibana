/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getTransactionDurationChartPreview } from '../../lib/alerts/chart_preview/get_transaction_duration';
import { getTransactionErrorCountChartPreview } from '../../lib/alerts/chart_preview/get_transaction_error_count';
import { getTransactionErrorRateChartPreview } from '../../lib/alerts/chart_preview/get_transaction_error_rate';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createRoute } from '../create_route';
import { rangeRt } from '../default_api_types';

const alertParamsRt = t.intersection([
  t.partial({
    aggregationType: t.union([
      t.literal('avg'),
      t.literal('95th'),
      t.literal('99th'),
    ]),
    serviceName: t.string,
    environment: t.string,
    transactionType: t.string,
  }),
  rangeRt,
]);

export type AlertParams = t.TypeOf<typeof alertParamsRt>;

export const transactionErrorRateChartPreview = createRoute({
  endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { _debug, ...alertParams } = context.params.query;

    return getTransactionErrorRateChartPreview({
      setup,
      alertParams,
    });
  },
});

export const transactionErrorCountChartPreview = createRoute({
  endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { _debug, ...alertParams } = context.params.query;
    return getTransactionErrorCountChartPreview({
      setup,
      alertParams,
    });
  },
});

export const transactionDurationChartPreview = createRoute({
  endpoint: 'GET /api/apm/alerts/chart_preview/transaction_duration',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { _debug, ...alertParams } = context.params.query;

    return getTransactionDurationChartPreview({
      alertParams,
      setup,
    });
  },
});
