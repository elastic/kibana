/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APMPluginStartDependencies } from '../../types';
import type { Setup } from '../helpers/setup_request';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';
import type { PackagePolicy } from './register_fleet_policy_callbacks';
import { getPackagePolicyWithAgentConfigurations } from './register_fleet_policy_callbacks';
import { getPackagePolicyWithSourceMap, listArtifacts } from './source_maps';

export async function mergePackagePolicyWithApm({
  packagePolicy,
  setup,
  fleetPluginStart,
}: {
  packagePolicy: PackagePolicy;
  setup: Setup;
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
}) {
  const agentConfigurations = await listConfigurations({ setup });
  const artifacts = await listArtifacts({ fleetPluginStart });
  return getPackagePolicyWithAgentConfigurations(
    getPackagePolicyWithSourceMap({ packagePolicy, artifacts }),
    agentConfigurations
  );
}
