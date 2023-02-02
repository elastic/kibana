/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getTransactionDurationChartPreview } from './rule_types/transaction_duration/get_transaction_duration_chart_preview';
import { getTransactionErrorCountChartPreview } from './rule_types/error_count/get_error_count_chart_preview';
import { getTransactionErrorRateChartPreview } from './rule_types/transaction_error_rate/get_transaction_error_rate_chart_preview';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt } from '../default_api_types';
import { AggregationType } from '../../../common/rules/apm_rule_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

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
  endpoint: 'GET /internal/apm/rule_types/transaction_error_rate/chart_preview',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ errorRateChartPreview: Array<{ x: number; y: number }> }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { _inspect, ...alertParams } = params.query;

    const errorRateChartPreview = await getTransactionErrorRateChartPreview({
      config,
      apmEventClient,
      alertParams,
    });

    return { errorRateChartPreview };
  },
});

const transactionErrorCountChartPreview = createApmServerRoute({
  endpoint: 'GET /internal/apm/rule_types/error_count/chart_preview',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ errorCountChartPreview: Array<{ x: number; y: number }> }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const { _inspect, ...alertParams } = params.query;

    const errorCountChartPreview = await getTransactionErrorCountChartPreview({
      apmEventClient,
      alertParams,
    });

    return { errorCountChartPreview };
  },
});

const transactionDurationChartPreview = createApmServerRoute({
  endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
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
    const apmEventClient = await getApmEventClient(resources);

    const { params, config } = resources;

    const { _inspect, ...alertParams } = params.query;

    const latencyChartPreview = await getTransactionDurationChartPreview({
      alertParams,
      config,
      apmEventClient,
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
