/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { AgentConfiguration } from '../../../common/agent_configuration/configuration_types';
import { APMPluginStartDependencies } from '../../types';

export async function syncAgentConfigsToApmPackagePolicies({
  fleetPluginStart,
  savedObjectsClient,
  esClient,
  agentConfigurations,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  agentConfigurations: AgentConfiguration[];
}) {
  const agentConfigs = agentConfigurations.map((config) => ({
    service: config.service,
    settings: config.settings,
  }));
  const packagePolicies = await fleetPluginStart.packagePolicyService.list(
    savedObjectsClient,
    { kuery: 'ingest-package-policies.package.name:apm' }
  );

  return Promise.all(
    packagePolicies.items.map(async (item) => {
      const { id, revision, updated_at, updated_by, ...packagePolicy } = item;
      packagePolicy.inputs[0].config = {
        agent_config: {
          value: agentConfigs,
        },
      };
      return fleetPluginStart.packagePolicyService.update(
        savedObjectsClient,
        esClient,
        id,
        packagePolicy
      );
    })
  );
}

export async function getAgentConfigsFromApmPackagePolicy({
  savedObjectsClient,
  fleetPluginStart,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  fleetPluginStart: APMPluginStartDependencies['fleet'];
}) {
  if (!fleetPluginStart) {
    return;
  }
  const packagePolicies = await fleetPluginStart.packagePolicyService.list(
    savedObjectsClient,
    { kuery: 'ingest-package-policies.package.name:apm' }
  );
  const { config } = packagePolicies.items[0].inputs[0];
  return config?.agent_config;
}
