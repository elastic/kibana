/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { EntityServiceListItem } from '../../../../common/entities/types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { createEntitiesESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../../default_api_types';
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
    const { context, params, request, plugins } = resources;
    const [coreContext] = await Promise.all([
      context.core,
      getApmEventClient(resources),
      plugins.logsDataAccess.start(),
    ]);

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

const serviceLogRateTimeseriesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/entities/services/{serviceName}/log_rate',
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

    const logsRateTimeseries = await logsDataAccessStart.services.getLogsRateTimeseries({
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      identifyingMetadata: 'service.name',
      timeFrom: start,
      timeTo: end,
      kuery,
      serviceEnvironmentQuery: environmentQuery(environment),
      serviceNames: [serviceName],
    });

    return { logsRateTimeseries };
  },
});

export const servicesEntitiesRoutesRepository = {
  ...servicesEntitiesRoute,
  ...serviceLogRateTimeseriesRoute,
};
