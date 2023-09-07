/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getPrivateLocations } from './get_private_locations';
import { RouteContext } from '../routes/types';
import { toClientContract } from '../routes/settings/private_locations/helpers';
import { getPrivateLocationsAndAgentPolicies } from '../routes/settings/private_locations/get_private_locations';
import { SyntheticsServerSetup } from '../types';
import { getServiceLocations } from './get_service_locations';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';

export async function getAllLocations({
  server,
  syntheticsMonitorClient,
  savedObjectsClient: soClient,
}: Pick<RouteContext, 'syntheticsMonitorClient' | 'savedObjectsClient' | 'server'>) {
  const [privateLocations, { locations: publicLocations }] = await Promise.all([
    getPrivateLocations(soClient),
    getServicePublicLocations(server, syntheticsMonitorClient),
  ]);

  const formattedLocations = toClientContract(privateLocations);

  return {
    publicLocations,
    privateLocations,
    allLocations: [...publicLocations, ...formattedLocations],
  };
}

export async function getAllLocationsWithMeta(routeContext: RouteContext) {
  const { server, syntheticsMonitorClient } = routeContext;
  try {
    const [
      { locations: privateLocations, agentPolicies, agentsMeta },
      { locations: publicLocations, throttling },
    ] = await Promise.all([
      getPrivateLocationsAndAgentPolicies(routeContext),
      getServicePublicLocations(server, syntheticsMonitorClient),
    ]);

    const formattedLocations = toClientContract(privateLocations, agentPolicies, agentsMeta);

    return {
      publicLocations,
      privateLocations,
      throttling,
      allLocations: [...publicLocations, ...formattedLocations],
    };
  } catch (e) {
    server.logger.error(e);
    return { publicLocations: [], privateLocations: [], allLocations: [] };
  }
}

export const getServicePublicLocations = async (
  server: SyntheticsServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => {
  if (syntheticsMonitorClient.syntheticsService.locations.length === 0) {
    return await getServiceLocations(server);
  }

  return {
    locations: syntheticsMonitorClient.syntheticsService.locations,
    throttling: syntheticsMonitorClient.syntheticsService.throttling,
  };
};
