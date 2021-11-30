/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  SavedObjectsClientContract,
} from 'kibana/server';
import { APMPluginStartDependencies } from '../../types';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';

export async function getFleetAgents({
  policyIds,
  core,
  fleetPluginStart,
}: {
  policyIds: string[];
  core: { setup: CoreSetup; start: () => Promise<CoreStart> };
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
}) {
  // @ts-ignore
  const savedObjectsClient: SavedObjectsClientContract =
    await getInternalSavedObjectsClient(core.setup);

  return await fleetPluginStart.agentPolicyService.getByIds(
    savedObjectsClient,
    policyIds
  );
}
