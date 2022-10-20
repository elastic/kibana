/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getTransactionDurationChartPreview } from './chart_preview/get_transaction_duration';
import { getTransactionErrorCountChartPreview } from './chart_preview/get_transaction_error_count';
import { getTransactionErrorRateChartPreview } from './chart_preview/get_transaction_error_rate';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt } from '../default_api_types';
import { AggregationType } from '../../../common/alert_types';

const alertParamsRt = t.intersection([
  t.partial({
    aggregationType: t.union([
      t.literal(AggregationType.Avg),
      t.literal(AggregationType.P95),
      t.literal(AggregationType.P99),
    ]),
    serviceName: t.string,
    transactionType: t.string,
  }),
  environmentRt,
  rangeRt,
  t.type({
    interval: t.string,
  }),
]);

export type AlertParams = t.TypeOf<typeof alertParamsRt>;

const transactionErrorRateChartPreview = createApmServerRoute({
  endpoint: 'GET /internal/apm/alerts/chart_preview/transaction_error_rate',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ errorRateChartPreview: Array<{ x: number; y: number }> }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { _inspect, ...alertParams } = params.query;

    const errorRateChartPreview = await getTransactionErrorRateChartPreview({
      setup,
      alertParams,
    });

    return { errorRateChartPreview };
  },
});

const transactionErrorCountChartPreview = createApmServerRoute({
  endpoint: 'GET /internal/apm/alerts/chart_preview/transaction_error_count',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ errorCountChartPreview: Array<{ x: number; y: number }> }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { _inspect, ...alertParams } = params.query;

    const errorCountChartPreview = await getTransactionErrorCountChartPreview({
      setup,
      alertParams,
    });

    return { errorCountChartPreview };
  },
});

const transactionDurationChartPreview = createApmServerRoute({
  endpoint: 'GET /internal/apm/alerts/chart_preview/transaction_duration',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    latencyChartPreview: Array<{
      name: string;
      data: Array<{ x: number; y: number | null }>;
    }>;
  }> => {
    const setup = await setupRequest(resources);

    const { params } = resources;

    const { _inspect, ...alertParams } = params.query;

    const latencyChartPreview = await getTransactionDurationChartPreview({
      alertParams,
      setup,
    });

    return { latencyChartPreview };
  },
});

export const alertsChartPreviewRouteRepository = {
  ...transactionErrorRateChartPreview,
  ...transactionDurationChartPreview,
  ...transactionErrorCountChartPreview,
  ...transactionDurationChartPreview,
};
