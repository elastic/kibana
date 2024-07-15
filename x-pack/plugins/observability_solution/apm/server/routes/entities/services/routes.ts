/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { toNumberRt, jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { offsetRt } from '../../../../common/comparison_rt';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../../lib/helpers/get_random_sampler';
import { EntityServiceListItem } from '../../../../common/entities/types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { createEntitiesESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  probabilityRt,
  rangeRt,
  serviceTransactionDataSourceRt,
} from '../../default_api_types';
import { getServiceTransactionDetailedStatsPeriods } from '../../services/get_services_detailed_statistics/get_service_transaction_detailed_statistics';
import { getServiceEntities } from './get_service_entities';

export interface EntityServicesResponse {
  services: EntityServiceListItem[];
}

const servicesEntitiesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/entities/services',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<EntityServicesResponse> {
    const { context, params, request } = resources;
    const coreContext = await context.core;

    const entitiesESClient = await createEntitiesESClient({
      request,
      esClient: coreContext.elasticsearch.client.asCurrentUser,
    });

    const { start, end, kuery, environment } = params.query;

    const services = await getServiceEntities({
      entitiesESClient,
      start,
      end,
      kuery,
      environment,
      logger: resources.logger,
    });

    return { services };
  },
});

const servicesEntitiesDetailedStatisticsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/entities/services/detailed_statistics',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.intersection([offsetRt, probabilityRt, serviceTransactionDataSourceRt]),
      t.type({
        bucketSizeInSeconds: toNumberRt,
      }),
    ]),
    body: t.type({ serviceNames: jsonRt.pipe(t.array(t.string)) }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const {
      context,
      params,
      request,
      plugins: { security, logsDataAccess },
    } = resources;

    const [coreContext, logsDataAccessStart] = await Promise.all([
      context.core,
      logsDataAccess.start(),
    ]);

    const {
      environment,
      kuery,
      offset,
      start,
      end,
      probability,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    } = params.query;

    const { serviceNames } = params.body;

    if (!serviceNames.length) {
      throw Boom.badRequest(`serviceNames cannot be empty`);
    }

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const logsParams = {
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      identifyingMetadata: 'service.name',
      timeFrom: start,
      timeTo: end,
      kuery,
      serviceEnvironmentQuery: environmentQuery(environment),
      serviceNames,
    };

    const [
      currentPeriodLogsRateTimeseries,
      currentPeriodLogsErrorRateTimeseries,
      apmServiceTransactionDetailedStatsPeriods,
    ] = await Promise.all([
      logsDataAccessStart.services.getLogsRateTimeseries(logsParams),
      logsDataAccessStart.services.getLogsErrorRateTimeseries(logsParams),
      getServiceTransactionDetailedStatsPeriods({
        environment,
        kuery,
        apmEventClient,
        documentType,
        rollupInterval,
        bucketSizeInSeconds,
        offset,
        serviceNames,
        start,
        end,
        randomSampler,
      }),
    ]);

    return {
      currentPeriod: {
        apm: { ...apmServiceTransactionDetailedStatsPeriods.currentPeriod },
        logErrorRate: { ...currentPeriodLogsErrorRateTimeseries },
        logRate: { ...currentPeriodLogsRateTimeseries },
      },
    };
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
  options: { tags: ['access:apm'] },
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
  options: { tags: ['access:apm'] },
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
  ...servicesEntitiesRoute,
  ...serviceLogRateTimeseriesRoute,
  ...serviceLogErrorRateTimeseriesRoute,
  ...servicesEntitiesDetailedStatisticsRoute,
};
