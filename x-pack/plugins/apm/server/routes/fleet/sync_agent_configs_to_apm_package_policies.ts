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
import { TelemetryUsageCounter } from '../typings';
import { APMPluginStartDependencies } from '../../types';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { Setup } from '../../lib/helpers/setup_request';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';
import { getApmPackgePolicies } from './get_apm_package_policies';
import { getPackagePolicyWithAgentConfigurations } from './register_fleet_policy_callbacks';

export async function syncAgentConfigsToApmPackagePolicies({
  core,
  fleetPluginStart,
  setup,
  telemetryUsageCounter,
}: {
  core: { setup: CoreSetup; start: () => Promise<CoreStart> };
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  setup: Setup;
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
      listConfigurations({ setup }),
      getApmPackgePolicies({
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
