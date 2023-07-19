/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { SyntheticsServerSetup } from '../types';
import { getPrivateLocations } from './get_private_locations';
import { getServiceLocations } from './get_service_locations';
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
    const [privateLocations, { locations: publicLocations, throttling }] = await Promise.all([
      getPrivateLocations(savedObjectsClient),
      getServicePublicLocations(server, syntheticsMonitorClient),
    ]);
    return {
      publicLocations,
      privateLocations,
      throttling,
      allLocations: [...publicLocations, ...privateLocations],
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
  if (syntheticsMonitorClient.syntheticsService.locations.length === 0) {
    return await getServiceLocations(server);
  }

  return {
    locations: syntheticsMonitorClient.syntheticsService.locations,
    throttling: syntheticsMonitorClient.syntheticsService.throttling,
  };
};
