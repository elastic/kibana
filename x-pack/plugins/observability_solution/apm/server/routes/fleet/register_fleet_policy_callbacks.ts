/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart, SavedObjectsClientContract } from '@kbn/core/server';
import {
  FleetStartContract,
  PostPackagePolicyCreateCallback,
  PostPackagePolicyDeleteCallback,
  PostPackagePolicyPostCreateCallback,
  PutPackagePolicyUpdateCallback,
} from '@kbn/fleet-plugin/server';
import { get } from 'lodash';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { decoratePackagePolicyWithAgentConfigAndSourceMap } from './merge_package_policy_with_apm';
import { addApiKeysToPackagePolicyIfMissing } from './api_keys/add_api_keys_to_policies_if_missing';
import {
  AGENT_CONFIG_API_KEY_PATH,
  SOURCE_MAP_API_KEY_PATH,
} from './get_package_policy_decorators';
import { createInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
import { getInternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';

export async function registerFleetPolicyCallbacks({
  logger,
  coreStartPromise,
  plugins,
}: {
  logger: Logger;
  coreStartPromise: Promise<CoreStart>;
  plugins: APMRouteHandlerResources['plugins'];
}) {
  if (!plugins.fleet) {
    return;
  }

  const fleetPluginStart = await plugins.fleet.start();
  const { getApmIndices } = plugins.apmDataAccess.setup;
  const coreStart = await coreStartPromise;

  fleetPluginStart.registerExternalCallback(
    'packagePolicyUpdate',
    onPackagePolicyCreateOrUpdate({
      fleetPluginStart,
      getApmIndices,
      coreStart,
    })
  );

  fleetPluginStart.registerExternalCallback(
    'packagePolicyCreate',
    onPackagePolicyCreateOrUpdate({
      fleetPluginStart,
      getApmIndices,
      coreStart,
    })
  );

  fleetPluginStart.registerExternalCallback(
    'packagePolicyDelete',
    onPackagePolicyDelete({ coreStart, logger })
  );

  fleetPluginStart.registerExternalCallback(
    'packagePolicyPostCreate',
    onPackagePolicyPostCreate({
      fleet: fleetPluginStart,
      coreStart,
      logger,
    })
  );
}

function onPackagePolicyDelete({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}): PostPackagePolicyDeleteCallback {
  return async (packagePolicies) => {
    const promises = packagePolicies.map(async (packagePolicy) => {
      if (packagePolicy.package?.name !== 'apm') {
        return packagePolicy;
      }

      const internalESClient = coreStart.elasticsearch.client.asInternalUser;

      const [agentConfigApiKeyId] = get(packagePolicy, AGENT_CONFIG_API_KEY_PATH).split(':');

      const [sourceMapApiKeyId] = get(packagePolicy, SOURCE_MAP_API_KEY_PATH).split(':');

      logger.debug(
        `Deleting API keys: ${agentConfigApiKeyId}, ${sourceMapApiKeyId} (package policy: ${packagePolicy.id})`
      );

      try {
        await internalESClient.security.invalidateApiKey({
          body: { ids: [agentConfigApiKeyId, sourceMapApiKeyId], owner: true },
        });
      } catch (e) {
        logger.error(
          `Failed to delete API keys: ${agentConfigApiKeyId}, ${sourceMapApiKeyId} (package policy: ${packagePolicy.id})`
        );
      }
    });

    await Promise.all(promises);
  };
}

function onPackagePolicyPostCreate({
  fleet,
  coreStart,
  logger,
}: {
  fleet: FleetStartContract;
  coreStart: CoreStart;
  logger: Logger;
}): PostPackagePolicyPostCreateCallback {
  return async (packagePolicy) => {
    if (packagePolicy.package?.name !== 'apm') {
      return packagePolicy;
    }

    // add api key to new package policy
    await addApiKeysToPackagePolicyIfMissing({
      policy: packagePolicy,
      coreStart,
      fleet,
      logger,
    });

    return packagePolicy;
  };
}

/*
 * This is called when a new package policy is created.
 * It will add an API key to the package policy.
 */
function onPackagePolicyCreateOrUpdate({
  fleetPluginStart,
  getApmIndices,
  coreStart,
}: {
  fleetPluginStart: FleetStartContract;
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
  coreStart: CoreStart;
}): PutPackagePolicyUpdateCallback & PostPackagePolicyCreateCallback {
  return async (packagePolicy) => {
    if (packagePolicy.package?.name !== 'apm') {
      return packagePolicy;
    }

    const { asInternalUser } = coreStart.elasticsearch.client;
    const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
    const apmIndices = await getApmIndices(savedObjectsClient);

    const internalESClient = await createInternalESClient({
      debug: false,
      elasticsearchClient: asInternalUser,
    });

    return decoratePackagePolicyWithAgentConfigAndSourceMap({
      internalESClient,
      fleetPluginStart,
      packagePolicy,
      apmIndices,
    });
  };
}
