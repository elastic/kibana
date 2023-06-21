/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { APMInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
import { APMPluginStartDependencies } from '../../types';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';
import {
  getPackagePolicyWithAgentConfigurations,
  getPackagePolicyWithSourceMap,
} from './get_package_policy_decorators';
import { listSourceMapArtifacts } from './source_maps';

export async function decoratePackagePolicyWithAgentConfigAndSourceMap({
  packagePolicy,
  internalESClient,
  fleetPluginStart,
}: {
  packagePolicy: NewPackagePolicy;
  internalESClient: APMInternalESClient;
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
}) {
  const [agentConfigurations, { artifacts }] = await Promise.all([
    listConfigurations(internalESClient),
    listSourceMapArtifacts({ fleetPluginStart }),
  ]);

  const policyWithSourceMaps = getPackagePolicyWithSourceMap({
    packagePolicy,
    artifacts,
  });

  const policyWithAgentConfigAndSourceMaps =
    getPackagePolicyWithAgentConfigurations(
      policyWithSourceMaps,
      agentConfigurations
    );

  return policyWithAgentConfigAndSourceMaps;
}
