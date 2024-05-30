/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { groupBy, omit, pick, isEqual } from 'lodash';

import apm from 'elastic-apm-node';

import type {
  NewPackagePolicy,
  AgentPolicy,
  Installation,
  Output,
  DownloadSource,
  PreconfiguredAgentPolicy,
  PreconfiguredPackage,
  PackagePolicy,
  PackageInfo,
} from '../../common/types';
import type { PreconfigurationError } from '../../common/constants';
import { PRECONFIGURATION_LATEST_KEYWORD } from '../../common/constants';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../constants';
import {
  type SimplifiedPackagePolicy,
  simplifiedPackagePolicytoNewPackagePolicy,
} from '../../common/services/simplified_package_policy_helper';

import { FleetError } from '../errors';

import { escapeSearchQueryPhrase } from './saved_object';
import { pkgToPkgKey } from './epm/registry';
import { getInstallation, getPackageInfo } from './epm/packages';
import { ensurePackagesCompletedInstall } from './epm/packages/install';
import { bulkInstallPackages } from './epm/packages/bulk_install_packages';
import { agentPolicyService, addPackageToAgentPolicy } from './agent_policy';
import { type InputsOverride, packagePolicyService } from './package_policy';
import { preconfigurePackageInputs } from './package_policy';
import { appContextService } from './app_context';
import type { UpgradeManagedPackagePoliciesResult } from './managed_package_policies';

interface PreconfigurationResult {
  policies: Array<{ id: string; updated_at: string }>;
  packages: string[];
  nonFatalErrors: Array<PreconfigurationError | UpgradeManagedPackagePoliciesResult>;
}

export async function ensurePreconfiguredPackagesAndPolicies(
  defaultSoClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policies: PreconfiguredAgentPolicy[] = [],
  packages: PreconfiguredPackage[] = [],
  defaultOutput: Output,
  defaultDownloadSource: DownloadSource,
  spaceId: string
): Promise<PreconfigurationResult> {
  const logger = appContextService.getLogger();
  const cloudSetup = appContextService.getCloud();

  // Validate configured packages to ensure there are no version conflicts
  const packageNames = groupBy(packages, (pkg) => pkg.name);
  const duplicatePackages = Object.entries(packageNames).filter(
    ([, versions]) => versions.length > 1
  );
  if (duplicatePackages.length) {
    // List duplicate packages as a comma-separated list of <package-name>:<semver>
    // If there are multiple packages with duplicate versions, separate them with semicolons, e.g
    // package-a:1.0.0, package-a:2.0.0; package-b:1.0.0, package-b:2.0.0
    const duplicateList = duplicatePackages
      .map(([, versions]) => versions.map((v) => pkgToPkgKey(v)).join(', '))
      .join('; ');

    throw new FleetError(
      i18n.translate('xpack.fleet.preconfiguration.duplicatePackageError', {
        defaultMessage: 'Duplicate packages specified in configuration: {duplicateList}',
        values: {
          duplicateList,
        },
      })
    );
  }

  const packagesToInstall = packages.map((pkg) =>
    pkg.version === PRECONFIGURATION_LATEST_KEYWORD
      ? {
          name: pkg.name,
          prerelease: pkg.prerelease,
          skipDataStreamRollover: pkg.skipDataStreamRollover,
        }
      : pkg
  );

  // Preinstall packages specified in Kibana config
  const preconfiguredPackages = await bulkInstallPackages({
    savedObjectsClient: defaultSoClient,
    esClient,
    packagesToInstall,
    force: true, // Always force outdated packages to be installed if a later version isn't installed
    spaceId,
  });

  const fulfilledPackages = [];
  const rejectedPackages: PreconfigurationError[] = [];

  for (let i = 0; i < preconfiguredPackages.length; i++) {
    const packageResult = preconfiguredPackages[i];
    if ('error' in packageResult) {
      logger.warn(
        `Failed installing package [${packages[i].name}] due to error: [${packageResult.error}]`
      );
      rejectedPackages.push({
        package: { name: packages[i].name, version: packages[i].version },
        error: packageResult.error,
      });
    } else {
      fulfilledPackages.push(packageResult);
    }
  }

  // Keeping this outside of the Promise.all because it introduces a race condition.
  // If one of the required packages fails to install/upgrade it might get stuck in the installing state.
  // On the next call to the /setup API, if there is a upgrade available for one of the required packages a race condition
  // will occur between upgrading the package and reinstalling the previously failed package.
  // By moving this outside of the Promise.all, the upgrade will occur first, and then we'll attempt to reinstall any
  // packages that are stuck in the installing state.
  await ensurePackagesCompletedInstall(defaultSoClient, esClient);

  // Create policies specified in Kibana config
  logger.debug(`Creating preconfigured policies`);
  const preconfiguredPolicies = await Promise.allSettled(
    policies.map(async (preconfiguredAgentPolicy) => {
      if (preconfiguredAgentPolicy.id) {
        // Check to see if a preconfigured policy with the same preconfiguration id was already deleted by the user
        const preconfigurationId = preconfiguredAgentPolicy.id.toString();
        const searchParams = {
          searchFields: ['id'],
          search: escapeSearchQueryPhrase(preconfigurationId),
        };
        const deletionRecords = await defaultSoClient.find({
          type: PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
          ...searchParams,
        });
        const wasDeleted = deletionRecords.total > 0;
        if (wasDeleted) {
          return { created: false, deleted: preconfigurationId };
        }
      } else if (
        !preconfiguredAgentPolicy.is_default &&
        !preconfiguredAgentPolicy.is_default_fleet_server
      ) {
        throw new FleetError(
          i18n.translate('xpack.fleet.preconfiguration.missingIDError', {
            defaultMessage:
              '{agentPolicyName} is missing an `id` field. `id` is required, except for policies marked is_default or is_default_fleet_server.',
            values: { agentPolicyName: preconfiguredAgentPolicy.name },
          })
        );
      }

      if (
        (!cloudSetup?.isServerlessEnabled ||
          !appContextService.getExperimentalFeatures().agentless) &&
        preconfiguredAgentPolicy?.supports_agentless !== undefined
      ) {
        throw new FleetError(
          i18n.translate('xpack.fleet.preconfiguration.support_agentless', {
            defaultMessage:
              '`supports_agentless` is only allowed in serverless environments that support the agentless feature',
          })
        );
      }

      const namespacedSoClient = preconfiguredAgentPolicy.space_id
        ? appContextService.getInternalUserSOClientForSpaceId(preconfiguredAgentPolicy.space_id)
        : defaultSoClient;

      const { created, policy } = await agentPolicyService.ensurePreconfiguredAgentPolicy(
        namespacedSoClient,
        esClient,
        omit(preconfiguredAgentPolicy, 'is_managed', 'space_id') // Don't add `is_managed` until the policy has been fully configured and not persist space_id
      );

      if (!created) {
        if (!policy) return { created, policy, namespacedSoClient };
        if (!policy.is_managed && !preconfiguredAgentPolicy.is_managed) return { created, policy };
        const { hasChanged, fields } = comparePreconfiguredPolicyToCurrent(
          preconfiguredAgentPolicy,
          policy
        );

        const newFields: Partial<AgentPolicy> = {
          download_source_id: defaultDownloadSource.id,
          ...fields,
        };
        if (hasChanged) {
          const updatedPolicy = await agentPolicyService.update(
            namespacedSoClient,
            esClient,
            String(preconfiguredAgentPolicy.id),
            newFields,
            {
              force: true,
            }
          );
          return { created, policy: updatedPolicy, namespacedSoClient };
        }
        return { created, policy, namespacedSoClient };
      }

      return {
        created,
        policy,
        namespacedSoClient,
        shouldAddIsManagedFlag: preconfiguredAgentPolicy.is_managed,
      };
    })
  );

  const fulfilledPolicies = [];
  const rejectedPolicies: PreconfigurationError[] = [];
  for (let i = 0; i < preconfiguredPolicies.length; i++) {
    const policyResult = preconfiguredPolicies[i];
    if (policyResult.status === 'rejected') {
      rejectedPolicies.push({
        error: policyResult.reason as Error,
        agentPolicy: { name: policies[i].name },
      });
      continue;
    }
    fulfilledPolicies.push(policyResult.value);
    const { created, policy, shouldAddIsManagedFlag, namespacedSoClient } = policyResult.value;

    if (created || policies[i].is_managed) {
      if (!namespacedSoClient) {
        throw new Error('No soClient created for that policy');
      }
      const preconfiguredAgentPolicy = policies[i];
      const { package_policies: packagePolicies } = preconfiguredAgentPolicy;

      const agentPolicyWithPackagePolicies = await agentPolicyService.get(
        namespacedSoClient,
        policy!.id,
        true
      );
      const installedPackagePolicies = await Promise.all(
        packagePolicies.map(async (preconfiguredPackagePolicy) => {
          const { package: pkg, ...newPackagePolicy } = preconfiguredPackagePolicy;
          const installedPackage = await getInstallation({
            savedObjectsClient: defaultSoClient,
            pkgName: pkg.name,
          });
          if (!installedPackage) {
            const rejectedPackage = rejectedPackages.find((rp) => rp.package?.name === pkg.name);

            if (rejectedPackage) {
              throw new FleetError(
                i18n.translate('xpack.fleet.preconfiguration.packageRejectedError', {
                  defaultMessage: `[{agentPolicyName}] could not be added. [{pkgName}] could not be installed due to error: [{errorMessage}]`,
                  values: {
                    agentPolicyName: preconfiguredAgentPolicy.name,
                    pkgName: pkg.name,
                    errorMessage: rejectedPackage.error.toString(),
                  },
                })
              );
            }
            throw new FleetError(
              i18n.translate('xpack.fleet.preconfiguration.packageMissingError', {
                defaultMessage:
                  '[{agentPolicyName}] could not be added. [{pkgName}] is not installed, add [{pkgName}] to [{packagesConfigValue}] or remove it from [{packagePolicyName}].',
                values: {
                  agentPolicyName: preconfiguredAgentPolicy.name,
                  packagePolicyName: newPackagePolicy.name,
                  pkgName: pkg.name,
                  packagesConfigValue: 'xpack.fleet.packages',
                },
              })
            );
          }
          return { installedPackage, packagePolicy: newPackagePolicy, namespacedSoClient };
        })
      );

      const packagePoliciesToAdd = installedPackagePolicies.filter((installablePackagePolicy) => {
        return !(agentPolicyWithPackagePolicies?.package_policies as PackagePolicy[]).some(
          (packagePolicy) =>
            (packagePolicy.id !== undefined &&
              packagePolicy.id === installablePackagePolicy.packagePolicy.id) ||
            packagePolicy.name === installablePackagePolicy.packagePolicy.name
        );
      });
      logger.debug(`Adding preconfigured package policies ${packagePoliciesToAdd}`);
      const s = apm.startSpan('Add preconfigured package policies', 'preconfiguration');
      await addPreconfiguredPolicyPackages(
        esClient,
        policy!,
        packagePoliciesToAdd!,
        defaultOutput,
        true
      );
      s?.end();

      // Add the is_managed flag after configuring package policies to avoid errors
      if (shouldAddIsManagedFlag) {
        await agentPolicyService.update(
          namespacedSoClient,
          esClient,
          policy!.id,
          { is_managed: true },
          {
            force: true,
          }
        );
      }
    }
  }

  return {
    policies: fulfilledPolicies.map((p) =>
      p.policy
        ? {
            id: p.policy.id!,
            updated_at: p.policy.updated_at,
          }
        : {
            id: p.deleted!,
            updated_at: i18n.translate('xpack.fleet.preconfiguration.policyDeleted', {
              defaultMessage: 'Preconfigured policy {id} was deleted; skipping creation',
              values: { id: p.deleted },
            }),
          }
    ),
    // @ts-expect-error upgrade typescript v4.9.5
    packages: fulfilledPackages.map((pkg) => ('version' in pkg ? pkgToPkgKey(pkg) : pkg.name)),
    nonFatalErrors: [...rejectedPackages, ...rejectedPolicies],
  };
}

export function comparePreconfiguredPolicyToCurrent(
  policyFromConfig: PreconfiguredAgentPolicy,
  currentPolicy: AgentPolicy
) {
  // Namespace is omitted from being compared because even for managed policies, we still
  // want users to be able to pick their own namespace: https://github.com/elastic/kibana/issues/110533
  const configTopLevelFields = omit(
    policyFromConfig,
    'package_policies',
    'id',
    'namespace',
    'space_id'
  );
  const currentTopLevelFields = pick(currentPolicy, ...Object.keys(configTopLevelFields));

  return {
    hasChanged: !isEqual(configTopLevelFields, currentTopLevelFields),
    fields: configTopLevelFields,
  };
}

async function addPreconfiguredPolicyPackages(
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  installedPackagePolicies: Array<{
    installedPackage: Installation;
    namespacedSoClient: SavedObjectsClientContract;
    packagePolicy:
      | (Partial<Omit<NewPackagePolicy, 'inputs'>> & {
          id?: string | number;
          name: string;
          inputs?: InputsOverride[];
        })
      | (Omit<SimplifiedPackagePolicy, 'package' | 'policy_id'> & { id: string });
  }>,
  defaultOutput: Output,
  bumpAgentPolicyRevison = false
) {
  // Cache package info objects so we don't waste lookup time on the latest package
  // every time we call `getPackageInfo`
  const packageInfoMap = new Map<string, PackageInfo>();

  // Add packages synchronously to avoid overwriting
  for (const { installedPackage, packagePolicy, namespacedSoClient } of installedPackagePolicies) {
    let packageInfo: PackageInfo;
    if (packageInfoMap.has(installedPackage.name)) {
      packageInfo = packageInfoMap.get(installedPackage.name)!;
    } else {
      packageInfo = await getPackageInfo({
        savedObjectsClient: namespacedSoClient,
        pkgName: installedPackage.name,
        pkgVersion: installedPackage.version,
      });
    }

    if (Array.isArray(packagePolicy.inputs)) {
      const { id, name, description, inputs } = packagePolicy;
      await addPackageToAgentPolicy(
        namespacedSoClient,
        esClient,
        agentPolicy,
        packageInfo,
        name,
        id,
        description,
        (policy) => preconfigurePackageInputs(policy, packageInfo, inputs),
        bumpAgentPolicyRevison
      );
    } else {
      const simplifiedPackagePolicy = packagePolicy as SimplifiedPackagePolicy;
      const id = simplifiedPackagePolicy.id?.toString();
      // Simplified package policy
      const newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(
        {
          ...(simplifiedPackagePolicy as SimplifiedPackagePolicy),
          id,
          policy_id: agentPolicy.id,
          namespace: packagePolicy.namespace || agentPolicy.namespace,
        },
        packageInfo,
        {}
      );

      await packagePolicyService.create(namespacedSoClient, esClient, newPackagePolicy, {
        id,
        bumpRevision: bumpAgentPolicyRevison,
        skipEnsureInstalled: true,
        skipUniqueNameVerification: true,
        overwrite: true,
        force: true, // To add package to managed policy we need the force flag
        packageInfo,
      });
    }
  }
}
