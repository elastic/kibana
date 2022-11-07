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
} from '@kbn/core/server';
import { TelemetryUsageCounter } from '../typings';
import { APMPluginStartDependencies } from '../../types';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';
import { getApmPackagePolicies } from './get_apm_package_policies';
import { getPackagePolicyWithAgentConfigurations } from './register_fleet_policy_callbacks';
import { APMInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';

export async function syncAgentConfigsToApmPackagePolicies({
  core,
  fleetPluginStart,
  internalESClient,
  telemetryUsageCounter,
}: {
  core: { setup: CoreSetup; start: () => Promise<CoreStart> };
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  internalESClient: APMInternalESClient;
  telemetryUsageCounter?: TelemetryUsageCounter;
}) {
  if (telemetryUsageCounter) {
    telemetryUsageCounter.incrementCounter({
      counterName: 'sync_agent_config_to_apm_package_policies',
      counterType: 'success',
    });
  }
  const coreStart = await core.start();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const [savedObjectsClient, agentConfigurations, packagePolicies] =
    await Promise.all([
      getInternalSavedObjectsClient(core.setup),
      listConfigurations(internalESClient),
      getApmPackagePolicies({
        core,
        fleetPluginStart,
      }),
    ]);

  return Promise.all(
    packagePolicies.items.map(async (item) => {
      const { id, revision, updated_at, updated_by, ...packagePolicy } = item; // eslint-disable-line @typescript-eslint/naming-convention
      const updatedPackagePolicy = getPackagePolicyWithAgentConfigurations(
        packagePolicy,
        agentConfigurations
      );
      return fleetPluginStart.packagePolicyService.update(
        savedObjectsClient as unknown as SavedObjectsClientContract,
        esClient,
        id,
        updatedPackagePolicy
      );
    })
  );
}
