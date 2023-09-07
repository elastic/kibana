/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { AgentPolicyInfo } from '../../../../common/types';
import { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  AgentsMeta,
  getPrivateLocationsWithAgentsMeta,
} from '../../../synthetics_service/get_private_locations';
import type { SyntheticsPrivateLocationsAttributes } from '../../../runtime_types/private_locations';
import { toClientContract } from './helpers';

export const getPrivateLocationsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsPrivateLocations
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {},
  handler: async (routeContext) => {
    const { locations, agentPolicies, agentsMeta } = await getPrivateLocationsAndAgentPolicies(
      routeContext
    );
    return toClientContract(locations, agentPolicies, agentsMeta);
  },
});

export const getPrivateLocationsAndAgentPolicies = async (
  routeContext: RouteContext
): Promise<{
  agentPolicies: AgentPolicyInfo[];
  agentsMeta: AgentsMeta;
  locations: SyntheticsPrivateLocationsAttributes;
}> => {
  try {
    const [{ locations, agentsMeta }, agentPolicies] = await Promise.all([
      getPrivateLocationsWithAgentsMeta(routeContext),
      routeContext.syntheticsMonitorClient.privateLocationAPI.getAgentPolicies(),
    ]);
    return {
      locations: locations || [],
      agentsMeta: agentsMeta || [],
      agentPolicies,
    };
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return { locations: [], agentPolicies: [], agentsMeta: [] };
    }
    throw getErr;
  }
};
