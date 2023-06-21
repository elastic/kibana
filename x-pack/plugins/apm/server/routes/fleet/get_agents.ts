/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, SavedObjectsClientContract } from '@kbn/core/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { keyBy } from 'lodash';
import { APMPluginStartDependencies } from '../../types';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { getApmPackagePolicies } from './get_apm_package_policies';

async function getFleetAgentByIds({
  policyIds,
  coreStart,
  fleetPluginStart,
}: {
  policyIds: string[];
  coreStart: CoreStart;
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
}) {
  // @ts-ignore
  const savedObjectsClient: SavedObjectsClientContract =
    await getInternalSavedObjectsClient(coreStart);

  return await fleetPluginStart.agentPolicyService.getByIds(
    savedObjectsClient,
    policyIds
  );
}

export interface FleetAgentResponse {
  cloudStandaloneSetup:
    | { apmServerUrl: string | undefined; secretToken: string | undefined }
    | undefined;
  isFleetEnabled: boolean;
  fleetAgents: Array<{
    id: string;
    name: string;
    apmServerUrl: any;
    secretToken: any;
  }>;
}

export async function getFleetAgents({
  fleetPluginStart,
  cloudPluginSetup,
  coreStart,
}: {
  fleetPluginStart?: FleetStartContract;
  cloudPluginSetup?: CloudSetup;
  coreStart: CoreStart;
}): Promise<FleetAgentResponse> {
  const cloudStandaloneSetup = cloudPluginSetup
    ? {
        apmServerUrl: cloudPluginSetup?.apm.url,
        secretToken: cloudPluginSetup?.apm.secretToken,
      }
    : undefined;

  if (!fleetPluginStart) {
    return { cloudStandaloneSetup, fleetAgents: [], isFleetEnabled: false };
  }

  // fetches package policies that contains APM integrations
  const packagePolicies = await getApmPackagePolicies({
    coreStart,
    fleetPluginStart,
  });

  const policiesGroupedById = keyBy(packagePolicies.items, 'policy_id');

  // fetches all agents with the found package policies
  const fleetAgents = await getFleetAgentByIds({
    policyIds: Object.keys(policiesGroupedById),
    coreStart,
    fleetPluginStart,
  });

  return {
    cloudStandaloneSetup,
    isFleetEnabled: true,
    fleetAgents: fleetAgents.map((agent) => {
      const packagePolicy = policiesGroupedById[agent.id];
      const packagePolicyVars = packagePolicy.inputs[0]?.vars;
      return {
        id: agent.id,
        name: agent.name,
        apmServerUrl: packagePolicyVars?.url?.value,
        secretToken: packagePolicyVars?.secret_token?.value,
      };
    }),
  };
}
