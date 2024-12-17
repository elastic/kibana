/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../../default_api_types';
import { getServiceEntitySummary } from './get_service_entity_summary';

const serviceEntitiesSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/entities/services/{serviceName}/summary',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: environmentRt,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources) {
    const { params, request, plugins } = resources;
    const entityManagerStart = await plugins.entityManager.start();

    const entityManagerClient = await entityManagerStart.getScopedClient({ request });
    const { serviceName } = params.path;
    const { environment } = params.query;

    const serviceEntitySummary = await getServiceEntitySummary({
      entityManagerClient,
      serviceName,
      environment,
    });

    return serviceEntitySummary;
  },
});

const serviceLogRateTimeseriesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/entities/services/{serviceName}/logs_rate_timeseries',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources) {
    const { context, params, plugins } = resources;
    const [coreContext, logsDataAccessStart] = await Promise.all([
      context.core,
      plugins.logsDataAccess.start(),
    ]);

    const { serviceName } = params.path;
    const { start, end, kuery, environment } = params.query;

    const currentPeriodLogsRateTimeseries =
      await logsDataAccessStart.services.getLogsRateTimeseries({
        esClient: coreContext.elasticsearch.client.asCurrentUser,
        identifyingMetadata: 'service.name',
        timeFrom: start,
        timeTo: end,
        kuery,
        serviceEnvironmentQuery: environmentQuery(environment),
        serviceNames: [serviceName],
      });

    return { currentPeriod: currentPeriodLogsRateTimeseries };
  },
});

const serviceLogErrorRateTimeseriesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/entities/services/{serviceName}/logs_error_rate_timeseries',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources) {
    const { context, params, plugins } = resources;
    const [coreContext, logsDataAccessStart] = await Promise.all([
      context.core,
      plugins.logsDataAccess.start(),
    ]);

    const { serviceName } = params.path;
    const { start, end, kuery, environment } = params.query;

    const logsErrorRateTimeseries = await logsDataAccessStart.services.getLogsErrorRateTimeseries({
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      identifyingMetadata: 'service.name',
      timeFrom: start,
      timeTo: end,
      kuery,
      serviceEnvironmentQuery: environmentQuery(environment),
      serviceNames: [serviceName],
    });

    return { currentPeriod: logsErrorRateTimeseries };
  },
});

export const servicesEntitiesRoutesRepository = {
  ...serviceLogRateTimeseriesRoute,
  ...serviceLogErrorRateTimeseriesRoute,
  ...serviceEntitiesSummaryRoute,
};
