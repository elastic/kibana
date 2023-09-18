/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { AgentPolicyInfo } from '../../../../common/types';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
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
): Promise<SyntheticsPrivateLocationsAttributes & { agentPolicies: AgentPolicyInfo[] }> => {
  try {
    const [privateLocations, agentPolicies] = await Promise.all([
      getPrivateLocations(savedObjectsClient),
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
