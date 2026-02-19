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
import { getK8sInfraNames } from './get_k8s_infra_names';
import { createInfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
import { hasOpenTelemetryPrefix } from '../../../common/agent_name';

const infrastructureRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/infrastructure_attributes',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt, t.partial({ agentName: t.string })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    containerIds: string[];
    hostNames: string[];
    podNames: string[];
    deploymentNames: string[];
    nodeNames: string[];
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const infraMetricsClient = createInfraMetricsClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, start, end, agentName },
    } = params;

    const isSemconv = hasOpenTelemetryPrefix(agentName);

    const infrastructureData = await getInfrastructureData({
      apmEventClient,
      serviceName,
      isSemconv,
      environment,
      kuery,
      start,
      end,
    });

    const { containerIds, podNames } = infrastructureData;

    // Resolve host names from container IDs and K8s deployment/node names
    // from pod names in parallel, both querying metrics indices.
    const [containerHostNames, k8sInfraNames] = await Promise.all([
      getContainerHostNames({
        containerIds,
        infraMetricsClient,
        start,
        end,
      }),
      getK8sInfraNames({
        podNames,
        infraMetricsClient,
        start,
        end,
      }),
    ]);

    return {
      containerIds,
      hostNames:
        containerIds.length > 0 // if we have container ids we rely on the hosts fetched filtering by container.id
          ? containerHostNames
          : infrastructureData.hostNames,
      podNames,
      deploymentNames: k8sInfraNames.deploymentNames,
      nodeNames: k8sInfraNames.nodeNames,
    };
  },
});

export const infrastructureRouteRepository = {
  ...infrastructureRoute,
};
