/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { getPrivateLocations } from './get_private_locations';
import { getServiceLocations } from './get_service_locations';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters/framework';

export async function getAllLocations(
  server: UptimeServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  savedObjectsClient: SavedObjectsClientContract
) {
  try {
    const [privateLocations, { locations: publicLocations, throttling }] = await Promise.all([
      getPrivateLocations(syntheticsMonitorClient, savedObjectsClient),
      getServicePublicLocations(server, syntheticsMonitorClient),
    ]);
    return { publicLocations, privateLocations, throttling };
  } catch (e) {
    server.logger.error(e);
    return { publicLocations: [], privateLocations: [] };
  }
}

const getServicePublicLocations = async (
  server: UptimeServerSetup,
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
