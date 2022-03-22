/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { groupBy, omit, pick, isEqual } from 'lodash';

import type {
  NewPackagePolicy,
  AgentPolicy,
  Installation,
  Output,
  PreconfiguredAgentPolicy,
  PreconfiguredPackage,
  PreconfigurationError,
  PackagePolicy,
} from '../../common';
import { PRECONFIGURATION_LATEST_KEYWORD } from '../../common';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../constants';

import { escapeSearchQueryPhrase } from './saved_object';
import { pkgToPkgKey } from './epm/registry';
import { getInstallation, getPackageInfo } from './epm/packages';
import { ensurePackagesCompletedInstall } from './epm/packages/install';
import { bulkInstallPackages } from './epm/packages/bulk_install_packages';
import { agentPolicyService, addPackageToAgentPolicy } from './agent_policy';
import type { InputsOverride } from './package_policy';
import { preconfigurePackageInputs } from './package_policy';
import { appContextService } from './app_context';
import type { UpgradeManagedPackagePoliciesResult } from './managed_package_policies';

interface PreconfigurationResult {
  policies: Array<{ id: string; updated_at: string }>;
  packages: string[];
  nonFatalErrors: Array<PreconfigurationError | UpgradeManagedPackagePoliciesResult>;
}

export async function ensurePreconfiguredPackagesAndPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policies: PreconfiguredAgentPolicy[] = [],
  packages: PreconfiguredPackage[] = [],
  defaultOutput: Output,
  spaceId: string
): Promise<PreconfigurationResult> {
  const logger = appContextService.getLogger();

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

    throw new Error(
      i18n.translate('xpack.fleet.preconfiguration.duplicatePackageError', {
        defaultMessage: 'Duplicate packages specified in configuration: {duplicateList}',
        values: {
          duplicateList,
        },
      })
    );
  }

  const packagesToInstall = packages.map((pkg) =>
    pkg.version === PRECONFIGURATION_LATEST_KEYWORD ? pkg.name : pkg
  );

  // Preinstall packages specified in Kibana config
  const preconfiguredPackages = await bulkInstallPackages({
    savedObjectsClient: soClient,
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
  await ensurePackagesCompletedInstall(soClient, esClient);

  // Create policies specified in Kibana config
  const preconfiguredPolicies = await Promise.allSettled(
    policies.map(async (preconfiguredAgentPolicy) => {
      if (preconfiguredAgentPolicy.id) {
        // Check to see if a preconfigured policy with the same preconfiguration id was already deleted by the user
        const preconfigurationId = preconfiguredAgentPolicy.id.toString();
        const searchParams = {
          searchFields: ['id'],
          search: escapeSearchQueryPhrase(preconfigurationId),
        };
        const deletionRecords = await soClient.find({
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
        throw new Error(
          i18n.translate('xpack.fleet.preconfiguration.missingIDError', {
            defaultMessage:
              '{agentPolicyName} is missing an `id` field. `id` is required, except for policies marked is_default or is_default_fleet_server.',
            values: { agentPolicyName: preconfiguredAgentPolicy.name },
          })
        );
      }

      const { created, policy } = await agentPolicyService.ensurePreconfiguredAgentPolicy(
        soClient,
        esClient,
        omit(preconfiguredAgentPolicy, 'is_managed') // Don't add `is_managed` until the policy has been fully configured
      );

      if (!created) {
        if (!policy?.is_managed) return { created, policy };
        const { hasChanged, fields } = comparePreconfiguredPolicyToCurrent(
          preconfiguredAgentPolicy,
          policy
        );
        if (hasChanged) {
          const updatedPolicy = await agentPolicyService.update(
            soClient,
            esClient,
            String(preconfiguredAgentPolicy.id),
            fields,
            {
              fromPreconfiguration: true,
            }
          );
          return { created, policy: updatedPolicy };
        }
        return { created, policy };
      }

      return {
        created,
        policy,
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
    const { created, policy, shouldAddIsManagedFlag } = policyResult.value;
    if (created || policies[i].is_managed) {
      const preconfiguredAgentPolicy = policies[i];
      const { package_policies: packagePolicies } = preconfiguredAgentPolicy;

      const agentPolicyWithPackagePolicies = await agentPolicyService.get(
        soClient,
        policy!.id,
        true
      );
      const installedPackagePolicies = await Promise.all(
        packagePolicies.map(async ({ package: pkg, name, ...newPackagePolicy }) => {
          const installedPackage = await getInstallation({
            savedObjectsClient: soClient,
            pkgName: pkg.name,
          });
          if (!installedPackage) {
            const rejectedPackage = rejectedPackages.find((rp) => rp.package?.name === pkg.name);

            if (rejectedPackage) {
              throw new Error(
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

            throw new Error(
              i18n.translate('xpack.fleet.preconfiguration.packageMissingError', {
                defaultMessage:
                  '[{agentPolicyName}] could not be added. [{pkgName}] is not installed, add [{pkgName}] to [{packagesConfigValue}] or remove it from [{packagePolicyName}].',
                values: {
                  agentPolicyName: preconfiguredAgentPolicy.name,
                  packagePolicyName: name,
                  pkgName: pkg.name,
                  packagesConfigValue: 'xpack.fleet.packages',
                },
              })
            );
          }
          return { name, installedPackage, ...newPackagePolicy };
        })
      );

      const packagePoliciesToAdd = installedPackagePolicies.filter((installablePackagePolicy) => {
        return !(agentPolicyWithPackagePolicies?.package_policies as PackagePolicy[]).some(
          (packagePolicy) =>
            (packagePolicy.id !== undefined && packagePolicy.id === installablePackagePolicy.id) ||
            packagePolicy.name === installablePackagePolicy.name
        );
      });

      await addPreconfiguredPolicyPackages(
        soClient,
        esClient,
        policy!,
        packagePoliciesToAdd!,
        defaultOutput,
        true
      );

      // Add the is_managed flag after configuring package policies to avoid errors
      if (shouldAddIsManagedFlag) {
        await agentPolicyService.update(
          soClient,
          esClient,
          policy!.id,
          { is_managed: true },
          {
            fromPreconfiguration: true,
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
  const configTopLevelFields = omit(policyFromConfig, 'package_policies', 'id', 'namespace');
  const currentTopLevelFields = pick(currentPolicy, ...Object.keys(configTopLevelFields));

  return {
    hasChanged: !isEqual(configTopLevelFields, currentTopLevelFields),
    fields: configTopLevelFields,
  };
}

async function addPreconfiguredPolicyPackages(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  installedPackagePolicies: Array<
    Partial<Omit<NewPackagePolicy, 'inputs'>> & {
      id?: string | number;
      name: string;
      installedPackage: Installation;
      inputs?: InputsOverride[];
    }
  >,
  defaultOutput: Output,
  bumpAgentPolicyRevison = false
) {
  // Add packages synchronously to avoid overwriting
  for (const { installedPackage, id, name, description, inputs } of installedPackagePolicies) {
    const packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName: installedPackage.name,
      pkgVersion: installedPackage.version,
    });

    await addPackageToAgentPolicy(
      soClient,
      esClient,
      installedPackage,
      agentPolicy,
      defaultOutput,
      name,
      id,
      description,
      (policy) => preconfigurePackageInputs(policy, packageInfo, inputs),
      bumpAgentPolicyRevison
    );
  }
}
