/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { AUTO_UPDATE_PACKAGES } from '../../common';
import type { DefaultPackagesInstallationError, PreconfigurationError } from '../../common';
import { SO_SEARCH_LIMIT, DEFAULT_PACKAGES } from '../constants';

import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import {
  cleanPreconfiguredOutputs,
  ensurePreconfiguredOutputs,
  ensurePreconfiguredPackagesAndPolicies,
} from './preconfiguration';
import { outputService } from './output';

import { generateEnrollmentAPIKey, hasEnrollementAPIKeysForPolicy } from './api_keys';
import { settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { ensureFleetServerAgentPoliciesExists } from './agents';
import { ensureFleetFinalPipelineIsInstalled } from './epm/elasticsearch/ingest_pipeline/install';
import { ensureDefaultComponentTemplate } from './epm/elasticsearch/template/install';
import { getInstallations, installPackage } from './epm/packages';
import { isPackageInstalled } from './epm/packages/install';
import { pkgToPkgKey } from './epm/registry';
import type { UpgradeManagedPackagePoliciesResult } from './managed_package_policies';

export interface SetupStatus {
  isInitialized: boolean;
  nonFatalErrors: Array<
    PreconfigurationError | DefaultPackagesInstallationError | UpgradeManagedPackagePoliciesResult
  >;
}

export async function setupFleet(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  return awaitIfPending(async () => createSetupSideEffects(soClient, esClient));
}

async function createSetupSideEffects(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  const logger = appContextService.getLogger();
  logger.info('Beginning fleet setup');

  const {
    agentPolicies: policiesOrUndefined,
    packages: packagesOrUndefined,
    outputs: outputsOrUndefined,
  } = appContextService.getConfig() ?? {};

  const policies = policiesOrUndefined ?? [];
  let packages = packagesOrUndefined ?? [];

  logger.debug('Setting up Fleet outputs');
  await Promise.all([
    ensurePreconfiguredOutputs(soClient, esClient, outputsOrUndefined ?? []),
    settingsService.settingsSetup(soClient),
  ]);

  const defaultOutput = await outputService.ensureDefaultOutput(soClient);

  if (appContextService.getConfig()?.agentIdVerificationEnabled) {
    logger.debug('Setting up Fleet Elasticsearch assets');
    await ensureFleetGlobalEsAssets(soClient, esClient);
  }

  // Ensure that required packages are always installed even if they're left out of the config
  const preconfiguredPackageNames = new Set(packages.map((pkg) => pkg.name));

  const autoUpdateablePackages = compact(
    await Promise.all(
      AUTO_UPDATE_PACKAGES.map((pkg) =>
        isPackageInstalled({
          savedObjectsClient: soClient,
          pkgName: pkg.name,
        }).then((installed) => (installed ? pkg : undefined))
      )
    )
  );

  packages = [
    ...packages,
    ...DEFAULT_PACKAGES.filter((pkg) => !preconfiguredPackageNames.has(pkg.name)),
    ...autoUpdateablePackages.filter((pkg) => !preconfiguredPackageNames.has(pkg.name)),
  ];

  logger.debug('Setting up initial Fleet packages');

  const { nonFatalErrors } = await ensurePreconfiguredPackagesAndPolicies(
    soClient,
    esClient,
    policies,
    packages,
    defaultOutput
  );

  logger.debug('Cleaning up Fleet outputs');
  await cleanPreconfiguredOutputs(soClient, outputsOrUndefined ?? []);

  logger.debug('Setting up Fleet enrollment keys');
  await ensureDefaultEnrollmentAPIKeysExists(soClient, esClient);

  logger.debug('Setting up Fleet Server agent policies');
  await ensureFleetServerAgentPoliciesExists(soClient, esClient);

  if (nonFatalErrors.length > 0) {
    logger.info('Encountered non fatal errors during Fleet setup');
    formatNonFatalErrors(nonFatalErrors).forEach((error) => logger.info(JSON.stringify(error)));
  }

  logger.info('Fleet setup completed');

  return {
    isInitialized: true,
    nonFatalErrors,
  };
}

/**
 * Ensure ES assets shared by all Fleet index template are installed
 */
export async function ensureFleetGlobalEsAssets(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger();
  // Ensure Global Fleet ES assets are installed
  logger.debug('Creating Fleet component template and ingest pipeline');
  const globalAssetsRes = await Promise.all([
    ensureDefaultComponentTemplate(esClient),
    ensureFleetFinalPipelineIsInstalled(esClient),
  ]);

  if (globalAssetsRes.some((asset) => asset.isCreated)) {
    // Update existing index template
    const packages = await getInstallations(soClient);

    await Promise.all(
      packages.saved_objects.map(async ({ attributes: installation }) => {
        if (installation.install_source !== 'registry') {
          logger.error(
            `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets`
          );
          return;
        }
        await installPackage({
          installSource: installation.install_source,
          savedObjectsClient: soClient,
          pkgkey: pkgToPkgKey({ name: installation.name, version: installation.version }),
          esClient,
          // Force install the package will update the index template and the datastream write indices
          force: true,
        }).catch((err) => {
          logger.error(
            `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets: ${err.message}`
          );
        });
      })
    );
  }
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

/**
 * Maps the `nonFatalErrors` object returned by the setup process to a more readable
 * and predictable format suitable for logging output or UI presentation.
 */
export function formatNonFatalErrors(
  nonFatalErrors: SetupStatus['nonFatalErrors']
): Array<{ name: string; message: string }> {
  return nonFatalErrors.flatMap((e) => {
    if ('error' in e) {
      return {
        name: e.error.name,
        message: e.error.message,
      };
    } else if ('errors' in e) {
      return e.errors.map((upgradePackagePolicyError: any) => {
        if (typeof upgradePackagePolicyError === 'string') {
          return {
            name: 'SetupNonFatalError',
            message: upgradePackagePolicyError,
          };
        }

        return {
          name: upgradePackagePolicyError.key,
          message: upgradePackagePolicyError.message,
        };
      });
    }
  });
}
