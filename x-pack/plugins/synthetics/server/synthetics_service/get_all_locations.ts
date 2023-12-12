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
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';

export async function getAllLocations({
  syntheticsMonitorClient,
  savedObjectsClient,
  server,
}: {
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  try {
    const [
      { locations: privateLocations, agentPolicies },
      { locations: publicLocations, throttling },
    ] = await Promise.all([
      getPrivateLocationsAndAgentPolicies(savedObjectsClient, syntheticsMonitorClient),
      getServicePublicLocations(syntheticsMonitorClient),
    ]);
    return {
      publicLocations,
      privateLocations,
      throttling,
      allLocations: [
        ...publicLocations,
        ...toClientContract({ locations: privateLocations }, agentPolicies),
      ],
    };
  } catch (e) {
    server.logger.error(e);
    return { publicLocations: [], privateLocations: [], allLocations: [] };
  }
}

const getServicePublicLocations = async ({ syntheticsService }: SyntheticsMonitorClient) => {
  if (syntheticsService.locations.length === 0) {
    return await syntheticsService.registerServiceLocations();
  }

  return {
    locations: syntheticsService.locations,
    throttling: syntheticsService.throttling,
  };
};
