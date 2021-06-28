/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { Maybe } from '../../../typings/common';
import { AgentPolicy, PackagePolicy } from '../../../../fleet/common';
import { APMPluginStartDependencies } from '../../types';

export const POLICY_ELASTIC_AGENT_ON_CLOUD = 'policy-elastic-agent-on-cloud';
export const APM_PACKAGE_NAME = 'apm';

export async function getCloudAgentPolicy({
  fleetPluginStart,
  savedObjectsClient,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  try {
    return await fleetPluginStart.agentPolicyService.get(
      savedObjectsClient,
      POLICY_ELASTIC_AGENT_ON_CLOUD
    );
  } catch (error) {
    if (error?.output.statusCode === 404) {
      return;
    }
    throw error;
  }
}

export function getApmPackagePolicy(agentPolicy: Maybe<AgentPolicy>) {
  if (!agentPolicy) {
    return;
  }
  const packagePolicies = agentPolicy.package_policies as PackagePolicy[];
  return packagePolicies.find(
    (packagePolicy) => packagePolicy?.package?.name === APM_PACKAGE_NAME
  );
}
