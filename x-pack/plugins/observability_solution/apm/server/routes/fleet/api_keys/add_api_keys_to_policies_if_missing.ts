/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { CoreStart, Logger } from '@kbn/core/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import { getInternalSavedObjectsClient } from '../../../lib/helpers/get_internal_saved_objects_client';
import { APMPluginStartDependencies } from '../../../types';
import { getApmPackagePolicies } from '../get_apm_package_policies';
import { createApmAgentConfigApiKey, createApmSourceMapApiKey } from './create_apm_api_keys';
import { getPackagePolicyWithApiKeys, policyHasApiKey } from '../get_package_policy_decorators';

export async function addApiKeysToEveryPackagePolicyIfMissing({
  coreStartPromise,
  pluginStartPromise,
  logger,
}: {
  coreStartPromise: Promise<CoreStart>;
  pluginStartPromise: Promise<APMPluginStartDependencies>;
  logger: Logger;
}) {
  const coreStart = await coreStartPromise;
  const { fleet } = await pluginStartPromise;
  if (!fleet) {
    return;
  }

  const apmFleetPolicies = await getApmPackagePolicies({
    coreStart,
    fleetPluginStart: fleet,
  });

  return Promise.all(
    apmFleetPolicies.items.map((policy) => {
      return addApiKeysToPackagePolicyIfMissing({
        policy,
        coreStart,
        fleet,
        logger,
      });
    })
  );
}

export async function addApiKeysToPackagePolicyIfMissing({
  policy,
  coreStart,
  fleet,
  logger,
}: {
  policy: PackagePolicy;
  coreStart: CoreStart;
  fleet: FleetStartContract;
  logger: Logger;
}) {
  if (policyHasApiKey(policy)) {
    logger.debug(`Policy (${policy.id}) already has api key`);
    return;
  }

  logger.debug(`Policy (${policy.id}) does not have api key`);

  const agentConfigApiKey = await createApmAgentConfigApiKey({
    coreStart,
    logger,
    packagePolicyId: policy.id,
  });

  const sourceMapApiKey = await createApmSourceMapApiKey({
    coreStart,
    logger,
    packagePolicyId: policy.id,
  });

  const packagePolicyTrimmed = omit(policy, ['id', 'revision', 'updated_at', 'updated_by']);
  const policyWithApiKeys = getPackagePolicyWithApiKeys({
    packagePolicy: packagePolicyTrimmed,
    agentConfigApiKey,
    sourceMapApiKey,
  });

  const internalESClient = coreStart.elasticsearch.client.asInternalUser;
  const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
  const newPolicy = await fleet.packagePolicyService.update(
    savedObjectsClient,
    internalESClient,
    policy.id,
    policyWithApiKeys
  );

  logger.debug(`Added api keys to policy ${policy.id}`);

  return newPolicy;
}
