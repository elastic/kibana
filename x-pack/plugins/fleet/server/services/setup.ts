/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';

import { DEFAULT_AGENT_POLICIES_PACKAGES, FLEET_SERVER_PACKAGE } from '../../common';

import type { PackagePolicy } from '../../common';

import { SO_SEARCH_LIMIT } from '../constants';

import { agentPolicyService, addPackageToAgentPolicy } from './agent_policy';
import { outputService } from './output';
import {
  ensureInstalledDefaultPackages,
  ensureInstalledPackage,
  ensurePackagesCompletedInstall,
} from './epm/packages/install';

import { generateEnrollmentAPIKey } from './api_keys';
import { settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { createDefaultSettings } from './settings';
import { ensureAgentActionPolicyChangeExists } from './agents';
import { awaitIfFleetServerSetupPending } from './fleet_server';

const FLEET_ENROLL_USERNAME = 'fleet_enroll';
const FLEET_ENROLL_ROLE = 'fleet_enroll';

export interface SetupStatus {
  isIntialized: true | undefined;
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
  const [
    installedPackages,
    defaultOutput,
    { created: defaultAgentPolicyCreated, policy: defaultAgentPolicy },
    { created: defaultFleetServerPolicyCreated, policy: defaultFleetServerPolicy },
  ] = await Promise.all([
    // packages installed by default
    ensureInstalledDefaultPackages(soClient, esClient),
    outputService.ensureDefaultOutput(soClient),
    agentPolicyService.ensureDefaultAgentPolicy(soClient, esClient),
    agentPolicyService.ensureDefaultFleetServerAgentPolicy(soClient, esClient),
    settingsService.getSettings(soClient).catch((e: any) => {
      if (e.isBoom && e.output.statusCode === 404) {
        const defaultSettings = createDefaultSettings();
        return settingsService.saveSettings(soClient, defaultSettings);
      }

      return Promise.reject(e);
    }),
  ]);

  // Keeping this outside of the Promise.all because it introduces a race condition.
  // If one of the required packages fails to install/upgrade it might get stuck in the installing state.
  // On the next call to the /setup API, if there is a upgrade available for one of the required packages a race condition
  // will occur between upgrading the package and reinstalling the previously failed package.
  // By moving this outside of the Promise.all, the upgrade will occur first, and then we'll attempt to reinstall any
  // packages that are stuck in the installing state.
  await ensurePackagesCompletedInstall(soClient, esClient);

  await awaitIfFleetServerSetupPending();

  const fleetServerPackage = await ensureInstalledPackage({
    savedObjectsClient: soClient,
    pkgName: FLEET_SERVER_PACKAGE,
    esClient,
  });

  if (defaultFleetServerPolicyCreated) {
    await addPackageToAgentPolicy(
      soClient,
      esClient,
      fleetServerPackage,
      defaultFleetServerPolicy,
      defaultOutput
    );
  }

  // If we just created the default fleet server policy add the fleet server package

  // If we just created the default policy, ensure default packages are added to it
  if (defaultAgentPolicyCreated) {
    const agentPolicyWithPackagePolicies = await agentPolicyService.get(
      soClient,
      defaultAgentPolicy.id,
      true
    );
    if (!agentPolicyWithPackagePolicies) {
      throw new Error(
        i18n.translate('xpack.fleet.setup.policyNotFoundError', {
          defaultMessage: 'Policy not found',
        })
      );
    }
    if (
      agentPolicyWithPackagePolicies.package_policies.length &&
      typeof agentPolicyWithPackagePolicies.package_policies[0] === 'string'
    ) {
      throw new Error(
        i18n.translate('xpack.fleet.setup.policyNotFoundError', {
          defaultMessage: 'Policy not found',
        })
      );
    }

    for (const installedPackage of installedPackages) {
      const packageShouldBeInstalled = DEFAULT_AGENT_POLICIES_PACKAGES.some(
        (packageName) => installedPackage.name === packageName
      );
      if (!packageShouldBeInstalled) {
        continue;
      }

      const isInstalled = agentPolicyWithPackagePolicies.package_policies.some(
        (d: PackagePolicy | string) => {
          return typeof d !== 'string' && d.package?.name === installedPackage.name;
        }
      );

      if (!isInstalled) {
        await addPackageToAgentPolicy(
          soClient,
          esClient,
          installedPackage,
          agentPolicyWithPackagePolicies,
          defaultOutput
        );
      }
    }
  }

  await ensureAgentActionPolicyChangeExists(soClient);

  return { isIntialized: true };
}

export async function setupFleet(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options?: { forceRecreate?: boolean }
) {
  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map((agentPolicy) => {
      return generateEnrollmentAPIKey(soClient, esClient, {
        name: `Default`,
        agentPolicyId: agentPolicy.id,
        forceRecreate: true, // Always generate a new enrollment key when Fleet is being set up
      });
    })
  );

  await Promise.all(
    agentPolicies.map((agentPolicy) =>
      agentPolicyService.createFleetPolicyChangeAction(soClient, agentPolicy.id)
    )
  );
}

function generateRandomPassword() {
  return Buffer.from(uuid.v4()).toString('base64');
}
