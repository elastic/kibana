/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';
import type { SyntheticsPrivateLocationsAttributes } from '../../../runtime_types/private_locations';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { toClientContract } from './helpers';

export const getPrivateLocationsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsPrivateLocations
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {},
  handler: async ({ savedObjectsClient, syntheticsMonitorClient }) => {
    const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );
    return toClientContract({ locations }, agentPolicies);
  },
});

export const getPrivateLocationsAndAgentPolicies = async (
  savedObjectsClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient
): Promise<SyntheticsPrivateLocationsAttributes & { agentPolicies: AgentPolicy[] }> => {
  try {
    const [privateLocations, agentPolicies] = await Promise.all([
      getPrivateLocationsSO(savedObjectsClient),
      syntheticsMonitorClient.privateLocationAPI.getAgentPolicies(),
    ]);
    return {
      locations: privateLocations || [],
      agentPolicies,
    };
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return { locations: [], agentPolicies: [] };
    }
    throw getErr;
  }
};

export const getPrivateLocationsSO = async (
  client: SavedObjectsClientContract
): Promise<SyntheticsPrivateLocationsAttributes['locations']> => {
  try {
    const obj = await client.get<SyntheticsPrivateLocationsAttributes>(
      privateLocationsSavedObjectName,
      privateLocationsSavedObjectId
    );
    return obj?.attributes.locations ?? [];
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return [];
    }
    throw getErr;
  }
};
