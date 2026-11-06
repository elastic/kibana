/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type TransactionErrorRateChartPreviewResponse,
  type ErrorCountChartPreviewResponse,
  type TransactionDurationChartPreviewResponse,
} from '@kbn/apm-api-shared';
import { getTransactionDurationChartPreview } from './rule_types/transaction_duration/get_transaction_duration_chart_preview';
import { getTransactionErrorCountChartPreview } from './rule_types/error_count/get_error_count_chart_preview';
import { getTransactionErrorRateChartPreview } from './rule_types/transaction_error_rate/get_transaction_error_rate_chart_preview';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const transactionErrorRateChartPreview = createApmServerRoute({
  endpoint: routeDefinitions.alerts.transactionErrorRateChartPreview.endpoint,
  params: routeDefinitions.alerts.transactionErrorRateChartPreview.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TransactionErrorRateChartPreviewResponse> => {
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
  endpoint: routeDefinitions.alerts.errorCountChartPreview.endpoint,
  params: routeDefinitions.alerts.errorCountChartPreview.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ErrorCountChartPreviewResponse> => {
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
  endpoint: routeDefinitions.alerts.transactionDurationChartPreview.endpoint,
  params: routeDefinitions.alerts.transactionDurationChartPreview.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TransactionDurationChartPreviewResponse> => {
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
  ...transactionErrorCountChartPreview,
  ...transactionDurationChartPreview,
};
