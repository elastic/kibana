/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import * as t from 'io-ts';
import { omit } from 'lodash';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  CorrelationValue,
  correlationValuesRouteRt,
  getApmCorrelationValues,
} from './get_apm_correlation_values';
import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
  type APMDownstreamDependency,
} from './get_apm_downstream_dependencies';
import {
  getApmServiceSummary,
  serviceSummaryRouteRt,
  type ServiceSummary,
} from './get_apm_service_summary';
import {
  getApmTimeseries,
  getApmTimeseriesRt,
  type ApmTimeseries,
} from './get_apm_timeseries';

const getApmTimeSeriesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_apm_timeseries',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    body: getApmTimeseriesRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: Array<Omit<ApmTimeseries, 'data'>>;
    data: ApmTimeseries[];
  }> => {
    const body = resources.params.body;

    const apmEventClient = await getApmEventClient(resources);

    const timeseries = await getApmTimeseries({
      apmEventClient,
      arguments: body,
    });

    return {
      content: timeseries.map(
        (series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')
      ),
      data: timeseries,
    };
  },
});

const getApmServiceSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_service_summary',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    query: serviceSummaryRouteRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: ServiceSummary;
  }> => {
    const args = resources.params.query;

    const { context, request, plugins, logger } = resources;

    const [
      apmEventClient,
      annotationsClient,
      esClient,
      apmAlertsClient,
      mlClient,
    ] = await Promise.all([
      getApmEventClient(resources),
      plugins.observability.setup.getScopedAnnotationsClient(context, request),
      context.core.then(
        (coreContext): ElasticsearchClient =>
          coreContext.elasticsearch.client.asCurrentUser
      ),
      getApmAlertsClient(resources),
      getMlClient(resources),
    ]);

    return {
      content: await getApmServiceSummary({
        apmEventClient,
        annotationsClient,
        esClient,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: args,
      }),
    };
  },
});

const getDownstreamDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    query: downstreamDependenciesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ content: APMDownstreamDependency[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { query } = params;

    return {
      content: await getAssistantDownstreamDependencies({
        arguments: query,
        apmEventClient,
      }),
    };
  },
});

const getApmCorrelationValuesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_correlation_values',
  params: t.type({
    body: correlationValuesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{ content: CorrelationValue[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { body } = params;

    return {
      content: await getApmCorrelationValues({
        arguments: body,
        apmEventClient,
      }),
    };
  },
});

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getApmServiceSummaryRoute,
  ...getApmCorrelationValuesRoute,
  ...getDownstreamDependenciesRoute,
};
