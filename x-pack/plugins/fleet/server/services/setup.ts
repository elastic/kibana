/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';

import { compact } from 'lodash';
import pMap from 'p-map';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { AUTO_UPDATE_PACKAGES, FILE_STORAGE_INTEGRATION_NAMES } from '../../common/constants';
import type { PreconfigurationError } from '../../common/constants';
import type {
  DefaultPackagesInstallationError,
  BundledPackage,
  Installation,
} from '../../common/types';

import { SO_SEARCH_LIMIT } from '../constants';

import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';
import {
  ensurePreconfiguredOutputs,
  getPreconfiguredOutputFromConfig,
} from './preconfiguration/outputs';
import {
  ensurePreconfiguredFleetProxies,
  getPreconfiguredFleetProxiesFromConfig,
} from './preconfiguration/fleet_proxies';
import { outputService } from './output';
import { downloadSourceService } from './download_source';

import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from './api_keys';
import { getRegistryUrl, settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import { ensureFleetFinalPipelineIsInstalled } from './epm/elasticsearch/ingest_pipeline/install';
import {
  ensureDefaultComponentTemplates,
  ensureFileUploadWriteIndices,
} from './epm/elasticsearch/template/install';
import { getInstallations, reinstallPackageForInstallation } from './epm/packages';
import { isPackageInstalled } from './epm/packages/install';
import type { UpgradeManagedPackagePoliciesResult } from './managed_package_policies';
import { upgradeManagedPackagePolicies } from './managed_package_policies';
import { getBundledPackages } from './epm/packages';
import { upgradePackageInstallVersion } from './setup/upgrade_package_install_version';
import { upgradeAgentPolicySchemaVersion } from './setup/upgrade_agent_policy_schema_version';
import { migrateSettingsToFleetServerHost } from './fleet_server_host';
import {
  ensurePreconfiguredFleetServerHosts,
  getPreconfiguredFleetServerHostFromConfig,
} from './preconfiguration/fleet_server_host';
import { getInstallationsByName } from './epm/packages/get';

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

  await ensureFleetDirectories();

  const { agentPolicies: policiesOrUndefined, packages: packagesOrUndefined } =
    appContextService.getConfig() ?? {};
  const policies = policiesOrUndefined ?? [];
  let packages = packagesOrUndefined ?? [];

  logger.debug('Setting Fleet server config');
  await migrateSettingsToFleetServerHost(soClient);
  logger.debug('Setting up Fleet download source');
  const defaultDownloadSource = await downloadSourceService.ensureDefault(soClient);
  // Need to be done before outputs and fleet server hosts as these object can reference a proxy
  logger.debug('Setting up Proxy');
  await ensurePreconfiguredFleetProxies(
    soClient,
    esClient,
    getPreconfiguredFleetProxiesFromConfig(appContextService.getConfig())
  );

  logger.debug('Setting up Fleet Sever Hosts');
  await ensurePreconfiguredFleetServerHosts(
    soClient,
    esClient,
    getPreconfiguredFleetServerHostFromConfig(appContextService.getConfig())
  );

  logger.debug('Setting up Fleet outputs');
  await Promise.all([
    ensurePreconfiguredOutputs(
      soClient,
      esClient,
      getPreconfiguredOutputFromConfig(appContextService.getConfig())
    ),

    settingsService.settingsSetup(soClient),
  ]);

  const defaultOutput = await outputService.ensureDefaultOutput(soClient);

  if (appContextService.getConfig()?.agentIdVerificationEnabled) {
    logger.debug('Setting up Fleet Elasticsearch assets');
    await ensureFleetGlobalEsAssets(soClient, esClient);
  }

  await ensureFleetFileUploadIndices(soClient, esClient);
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
    ...autoUpdateablePackages.filter((pkg) => !preconfiguredPackageNames.has(pkg.name)),
  ];

  logger.debug('Setting up initial Fleet packages');

  const { nonFatalErrors: preconfiguredPackagesNonFatalErrors } =
    await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      policies,
      packages,
      defaultOutput,
      defaultDownloadSource,
      DEFAULT_SPACE_ID
    );

  const packagePolicyUpgradeErrors = (
    await upgradeManagedPackagePolicies(soClient, esClient)
  ).filter((result) => (result.errors ?? []).length > 0);

  const nonFatalErrors = [...preconfiguredPackagesNonFatalErrors, ...packagePolicyUpgradeErrors];

  logger.debug('Upgrade Fleet package install versions');
  await upgradePackageInstallVersion({ soClient, esClient, logger });

  logger.debug('Upgrade Agent policy schema version');
  await upgradeAgentPolicySchemaVersion(soClient);

  logger.debug('Setting up Fleet enrollment keys');
  await ensureDefaultEnrollmentAPIKeysExists(soClient, esClient);

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
export async function ensureFleetFileUploadIndices(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const { diagnosticFileUploadEnabled } = appContextService.getExperimentalFeatures();
  if (!diagnosticFileUploadEnabled) return;
  const logger = appContextService.getLogger();
  const installedFileUploadIntegrations = await getInstallationsByName({
    savedObjectsClient: soClient,
    pkgNames: [...FILE_STORAGE_INTEGRATION_NAMES],
  });

  if (!installedFileUploadIntegrations.length) return [];
  const integrationNames = installedFileUploadIntegrations.map(({ name }) => name);
  logger.debug(`Ensuring file upload write indices for ${integrationNames}`);
  return ensureFileUploadWriteIndices({
    esClient,
    logger,
    integrationNames,
  });
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
    ensureDefaultComponentTemplates(esClient, logger), // returns an array
    ensureFleetFinalPipelineIsInstalled(esClient, logger),
  ]);
  const assetResults = globalAssetsRes.flat();
  if (assetResults.some((asset) => asset.isCreated)) {
    // Update existing index template
    const installedPackages = await getInstallations(soClient);
    const bundledPackages = await getBundledPackages();
    const findMatchingBundledPkg = (pkg: Installation) =>
      bundledPackages.find(
        (bundledPkg: BundledPackage) =>
          bundledPkg.name === pkg.name && bundledPkg.version === pkg.version
      );
    await pMap(
      installedPackages.saved_objects,
      async ({ attributes: installation }) => {
        if (installation.install_source !== 'registry') {
          const matchingBundledPackage = findMatchingBundledPkg(installation);
          if (!matchingBundledPackage) {
            logger.error(
              `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets`
            );
            return;
          }
        }
        await reinstallPackageForInstallation({
          soClient,
          esClient,
          installation,
        }).catch((err) => {
          logger.error(
            `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets: ${err.message}`
          );
        });
      },
      { concurrency: 10 }
    );
  }
}

async function ensureDefaultEnrollmentAPIKeysExists(
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

  await pMap(
    agentPolicies,
    (agentPolicy) =>
      ensureDefaultEnrollmentAPIKeyForAgentPolicy(soClient, esClient, agentPolicy.id),
    {
      concurrency: 20,
    }
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

/**
 * Confirm existence of various directories used by Fleet and warn if they don't exist
 */
export async function ensureFleetDirectories() {
  const logger = appContextService.getLogger();
  const config = appContextService.getConfig();

  const bundledPackageLocation = config?.developer?.bundledPackageLocation;
  const registryUrl = getRegistryUrl();

  if (!bundledPackageLocation) {
    logger.warn('xpack.fleet.developer.bundledPackageLocation is not configured');
    return;
  }

  try {
    await fs.stat(bundledPackageLocation);
  } catch (error) {
    logger.warn(
      `Bundled package directory ${bundledPackageLocation} does not exist. All packages will be sourced from ${registryUrl}.`
    );
  }
}
