/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { getInfrastructureData } from './get_infrastructure_data';
import { getContainerHostNames } from './get_host_names';
import { createInfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';

const infrastructureRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/infrastructure_attributes',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    containerIds: string[];
    hostNames: string[];
    podNames: string[];
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const infraMetricsClient = createInfraMetricsClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, start, end },
    } = params;

    const infrastructureData = await getInfrastructureData({
      apmEventClient,
      serviceName,
      environment,
      kuery,
      start,
      end,
    });

    const containerIds = infrastructureData.containerIds;
    // due some limitations on the data we get from apm-metrics indices, if we have a service running in a container we want to query, to get the host.name, filtering by container.id
    const containerHostNames = await getContainerHostNames({
      containerIds,
      infraMetricsClient,
      start,
      end,
    });

    return {
      containerIds,
      hostNames:
        containerIds.length > 0 // if we have container ids we rely on the hosts fetched filtering by container.id
          ? containerHostNames
          : infrastructureData.hostNames,
      podNames: infrastructureData.podNames,
    };
  },
});

export const infrastructureRouteRepository = {
  ...infrastructureRoute,
};
