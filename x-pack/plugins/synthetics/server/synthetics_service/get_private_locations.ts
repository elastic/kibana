/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AgentType } from '../../common/types';
import { resolveAgentPolicyComplete } from '../routes/settings/private_locations/helpers';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../common/saved_objects/private_locations';
import { RouteContext } from '../routes/types';
import type { SyntheticsPrivateLocationsAttributes } from '../runtime_types/private_locations';

export const getPrivateLocations = async (
  client: SavedObjectsClientContract
): Promise<SyntheticsPrivateLocationsAttributes> => {
  try {
    const obj = await client.get<{ locations: SyntheticsPrivateLocationsAttributes }>(
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
export type AgentsMeta = Array<{ id: string; agentType?: AgentType }>;
export const getPrivateLocationsWithAgentsMeta = async (routeContext: RouteContext) => {
  try {
    const locations = await getPrivateLocations(routeContext.savedObjectsClient);
    if (locations.length === 0) {
      return { locations: [], agentsMeta: [] };
    }
    const policyIds = locations.map((location) => location.agentPolicyId);

    const agentsMeta = await resolveAgentPolicyComplete(policyIds, routeContext.server);
    return { locations, agentsMeta };
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return { locations: [], agentsMeta: [] };
    }
    throw getErr;
  }
};
