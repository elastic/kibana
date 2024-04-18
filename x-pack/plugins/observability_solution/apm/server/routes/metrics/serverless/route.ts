/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
} from '@kbn/observability-plugin/common';
import { toNumberRt } from '@kbn/io-ts-utils';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt, transactionDataSourceRt } from '../../default_api_types';
import { getServerlessAgentMetricsCharts } from './get_serverless_agent_metrics_chart';
import {
  ActiveInstanceOverview,
  getServerlessActiveInstancesOverview,
} from './get_active_instances_overview';
import {
  getServerlessFunctionsOverview,
  ServerlessFunctionsOverviewResponse,
} from './get_serverless_functions_overview';
import {
  AWSLambdaPriceFactor,
  getServerlessSummary,
  ServerlessSummaryResponse,
} from './get_serverless_summary';
import { getActiveInstancesTimeseries } from './get_active_instances_timeseries';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { FetchAndTransformMetrics } from '../fetch_and_transform_metrics';
import { Coordinate } from '../../../../typings/timeseries';

const serverlessMetricsChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.partial({ serverlessId: t.string }),
      t.intersection([transactionDataSourceRt, t.type({ bucketSizeInSeconds: toNumberRt })]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    charts: FetchAndTransformMetrics[];
  }> => {
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      start,
      end,
      serverlessId,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    } = params.query;

    const charts = await getServerlessAgentMetricsCharts({
      environment,
      start,
      end,
      kuery,
      config,
      apmEventClient,
      serviceName,
      serverlessId,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    });

    return { charts };
  },
});

const serverlessMetricsActiveInstancesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt, t.partial({ serverlessId: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    activeInstances: ActiveInstanceOverview[];
    timeseries: Coordinate[];
  }> => {
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const { serviceName } = params.path;
    const { environment, kuery, start, end, serverlessId } = params.query;

    const options = {
      environment,
      start,
      end,
      kuery,
      serviceName,
      serverlessId,
      apmEventClient,
    };

    const [activeInstances, timeseries] = await Promise.all([
      getServerlessActiveInstancesOverview(options),
      getActiveInstancesTimeseries({ ...options, config }),
    ]);
    return { activeInstances, timeseries };
  },
});

const serverlessMetricsFunctionsOverviewRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    serverlessFunctionsOverview: ServerlessFunctionsOverviewResponse;
  }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const { serviceName } = params.path;
    const { environment, kuery, start, end } = params.query;

    const serverlessFunctionsOverview = await getServerlessFunctionsOverview({
      environment,
      start,
      end,
      kuery,
      apmEventClient,
      serviceName,
    });
    return { serverlessFunctionsOverview };
  },
});

const serverlessMetricsSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/summary',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt, t.partial({ serverlessId: t.string })]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServerlessSummaryResponse> => {
    const { params, context } = resources;
    const {
      uiSettings: { client: uiSettingsClient },
    } = await context.core;

    const [apmEventClient, awsLambdaPriceFactor, awsLambdaRequestCostPerMillion] =
      await Promise.all([
        getApmEventClient(resources),
        uiSettingsClient
          .get<string>(apmAWSLambdaPriceFactor)
          .then((value): AWSLambdaPriceFactor => JSON.parse(value) as AWSLambdaPriceFactor),
        uiSettingsClient.get<number>(apmAWSLambdaRequestCostPerMillion),
      ]);

    const { serviceName } = params.path;
    const { environment, kuery, start, end, serverlessId } = params.query;

    return getServerlessSummary({
      environment,
      start,
      end,
      kuery,
      apmEventClient,
      serviceName,
      serverlessId,
      awsLambdaPriceFactor,
      awsLambdaRequestCostPerMillion,
    });
  },
});

export const metricsServerlessRouteRepository = {
  ...serverlessMetricsChartsRoute,
  ...serverlessMetricsSummaryRoute,
  ...serverlessMetricsFunctionsOverviewRoute,
  ...serverlessMetricsActiveInstancesRoute,
};
