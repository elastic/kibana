/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AgentPolicy, PackagePolicy } from '../../../../fleet/common';
import { APMPluginStartDependencies } from '../../types';

export async function getCloudAgentPolicy({
  fleetPluginStart,
  savedObjectsClient,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const cloudAgentPolicy = await fleetPluginStart.agentPolicyService.get(
    savedObjectsClient,
    'policy-elastic-agent-on-cloud'
  );
  return cloudAgentPolicy;
}

export function getApmPackagePolicy(agentPolicy: AgentPolicy) {
  const packagePolicies = agentPolicy.package_policies as PackagePolicy[];
  return packagePolicies.find(
    (packagePolicy) => packagePolicy?.package?.name === 'apm'
  );
}
