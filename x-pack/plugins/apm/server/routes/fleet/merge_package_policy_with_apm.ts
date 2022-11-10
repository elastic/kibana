/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
import { APMPluginStartDependencies } from '../../types';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';
import {
  getPackagePolicyWithAgentConfigurations,
  PackagePolicy,
} from './register_fleet_policy_callbacks';
import { getPackagePolicyWithSourceMap, listArtifacts } from './source_maps';

export async function mergePackagePolicyWithApm({
  packagePolicy,
  internalESClient,
  fleetPluginStart,
}: {
  packagePolicy: PackagePolicy;
  internalESClient: APMInternalESClient;
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
}) {
  const agentConfigurations = await listConfigurations(internalESClient);
  const artifacts = await listArtifacts({ fleetPluginStart });
  return getPackagePolicyWithAgentConfigurations(
    getPackagePolicyWithSourceMap({ packagePolicy, artifacts }),
    agentConfigurations
  );
}
