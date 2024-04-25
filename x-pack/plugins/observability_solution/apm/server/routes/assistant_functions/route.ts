/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { omit } from 'lodash';
import {
  AlertDetailsContextualInsight,
  observabilityAlertDetailsContextRt,
} from '@kbn/observability-plugin/server/services';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getObservabilityAlertDetailsContext } from './get_observability_alert_details_context';

import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
  type APMDownstreamDependency,
} from './get_apm_downstream_dependencies';
import { getApmTimeseries, getApmTimeseriesRt, type ApmTimeseries } from './get_apm_timeseries';

const getObservabilityAlertDetailsContextRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/alert_details_contextual_insights',
  options: {
    tags: ['access:apm'],
  },

  params: t.type({
    query: observabilityAlertDetailsContextRt,
  }),
  handler: async (resources): Promise<{ context: AlertDetailsContextualInsight[] }> => {
    const { context, request, plugins, logger, params } = resources;
    const { query } = params;

    const [apmEventClient, annotationsClient, coreContext, apmAlertsClient, mlClient] =
      await Promise.all([
        getApmEventClient(resources),
        plugins.observability.setup.getScopedAnnotationsClient(context, request),
        context.core,
        getApmAlertsClient(resources),
        getMlClient(resources),
        getRandomSampler({
          security: resources.plugins.security,
          probability: 1,
          request: resources.request,
        }),
      ]);
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const obsAlertContext = await getObservabilityAlertDetailsContext({
      coreContext,
      annotationsClient,
      apmAlertsClient,
      apmEventClient,
      esClient,
      logger,
      mlClient,
      query,
    });

    return { context: obsAlertContext };
  },
});

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
      content: timeseries.map((series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')),
      data: timeseries,
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
  handler: async (resources): Promise<{ content: APMDownstreamDependency[] }> => {
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

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getObservabilityAlertDetailsContextRoute,
  ...getDownstreamDependenciesRoute,
};
