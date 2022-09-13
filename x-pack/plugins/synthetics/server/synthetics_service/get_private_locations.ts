/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';
import { getSyntheticsPrivateLocations } from '../legacy_uptime/lib/saved_objects/private_locations';
import { PrivateLocation } from '../../common/runtime_types';

export async function getPrivateLocations(
  syntheticsMonitorClient: SyntheticsMonitorClient,
  savedObjectsClient: SavedObjectsClientContract
) {
  const privateLocations: PrivateLocation[] = await getSyntheticsPrivateLocations(
    savedObjectsClient
  );
  const agentPolicies = await syntheticsMonitorClient.privateLocationAPI.getAgentPolicies();

  const privateLocs =
    privateLocations?.map((loc) => ({
      isServiceManaged: false,
      isInvalid: agentPolicies.find((policy) => policy.id === loc.agentPolicyId) === undefined,
      ...loc,
    })) ?? [];

  return privateLocs;
}
