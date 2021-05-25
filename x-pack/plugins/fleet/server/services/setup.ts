/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import type { DefaultPackagesInstallationError, PreconfigurationError } from '../../common';
import { SO_SEARCH_LIMIT, REQUIRED_PACKAGES } from '../constants';

import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';
import { outputService } from './output';

import { generateEnrollmentAPIKey, hasEnrollementAPIKeysForPolicy } from './api_keys';
import { settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { ensureAgentActionPolicyChangeExists } from './agents';
import { awaitIfFleetServerSetupPending } from './fleet_server';

export interface SetupStatus {
  isInitialized: boolean;
  nonFatalErrors?: Array<PreconfigurationError | DefaultPackagesInstallationError>;
}

export async function setupIngestManager(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  return awaitIfPending(async () => createSetupSideEffects(soClient, esClient));
}

async function createSetupSideEffects(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  const [defaultOutput] = await Promise.all([
    outputService.ensureDefaultOutput(soClient),
    settingsService.settingsSetup(soClient),
  ]);

  await awaitIfFleetServerSetupPending();

  const { agentPolicies: policiesOrUndefined, packages: packagesOrUndefined } =
    appContextService.getConfig() ?? {};

  const policies = policiesOrUndefined ?? [];

  let packages = packagesOrUndefined ?? [];
  // Ensure that required packages are always installed even if they're left out of the config
  const preconfiguredPackageNames = new Set(packages.map((pkg) => pkg.name));
  packages = [
    ...packages,
    ...REQUIRED_PACKAGES.filter((pkg) => !preconfiguredPackageNames.has(pkg.name)),
  ];

  const { nonFatalErrors } = await ensurePreconfiguredPackagesAndPolicies(
    soClient,
    esClient,
    policies,
    packages,
    defaultOutput
  );

  await ensureDefaultEnrollmentAPIKeysExists(soClient, esClient);
  await ensureAgentActionPolicyChangeExists(soClient, esClient);

  return {
    isInitialized: true,
    nonFatalErrors,
  };
}

export async function ensureDefaultEnrollmentAPIKeysExists(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options?: { forceRecreate?: boolean }
) {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    return;
  }

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map(async (agentPolicy) => {
      const hasKey = await hasEnrollementAPIKeysForPolicy(esClient, agentPolicy.id);

      if (hasKey) {
        return;
      }

      return generateEnrollmentAPIKey(soClient, esClient, {
        name: `Default`,
        agentPolicyId: agentPolicy.id,
        forceRecreate: true, // Always generate a new enrollment key when Fleet is being set up
      });
    })
  );
}
