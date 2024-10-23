/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { toClientContract } from '../routes/settings/private_locations/helpers';
import { getPrivateLocationsAndAgentPolicies } from '../routes/settings/private_locations/get_private_locations';
import { SyntheticsServerSetup } from '../types';
import { getServiceLocations } from './get_service_locations';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';

export async function getAllLocations({
  syntheticsMonitorClient,
  savedObjectsClient,
  server,
  excludeAgentPolicies = false,
}: {
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
  excludeAgentPolicies?: boolean;
}) {
  try {
    const [
      { locations: privateLocations, agentPolicies },
      { locations: publicLocations, throttling },
    ] = await Promise.all([
      getPrivateLocationsAndAgentPolicies(
        savedObjectsClient,
        syntheticsMonitorClient,
        excludeAgentPolicies
      ),
      getServicePublicLocations(server, syntheticsMonitorClient),
    ]);
    const pvtLocations = toClientContract({ locations: privateLocations }, agentPolicies);
    return {
      publicLocations,
      privateLocations: pvtLocations,
      throttling,
      allLocations: [...publicLocations, ...pvtLocations],
    };
  } catch (e) {
    server.logger.error(e);
    return { publicLocations: [], privateLocations: [], allLocations: [] };
  }
}

const getServicePublicLocations = async (
  server: SyntheticsServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => {
  if (!syntheticsMonitorClient.syntheticsService.isAllowed) {
    return {
      locations: [],
    };
  }
  if (syntheticsMonitorClient.syntheticsService.locations.length === 0) {
    return await getServiceLocations(server);
  }

  return {
    locations: syntheticsMonitorClient.syntheticsService.locations,
    throttling: syntheticsMonitorClient.syntheticsService.throttling,
  };
};
