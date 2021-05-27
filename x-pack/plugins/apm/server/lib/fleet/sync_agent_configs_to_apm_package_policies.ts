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
import { getInternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';
import { Setup } from '../helpers/setup_request';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';

export async function syncAgentConfigsToApmPackagePolicies({
  core,
  fleetPluginStart,
  setup,
}: {
  core: { setup: CoreSetup; start: () => Promise<CoreStart> };
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  setup: Setup;
}) {
  const coreStart = await core.start();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  // @ts-ignore
  const savedObjectsClient: SavedObjectsClientContract = await getInternalSavedObjectsClient(
    core.setup
  );
  const agentConfigurations = await listConfigurations({ setup });
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
      const { id, revision, updated_at, updated_by, ...packagePolicy } = item; // eslint-disable-line @typescript-eslint/naming-convention
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
