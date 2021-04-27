/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { groupBy, omit } from 'lodash';

import type {
  NewPackagePolicy,
  AgentPolicy,
  Installation,
  Output,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PreconfiguredAgentPolicy,
  PreconfiguredPackage,
  PreconfigurationError,
} from '../../common';
import {
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_LATEST_KEYWORD,
} from '../constants';

import { escapeSearchQueryPhrase } from './saved_object';

import { pkgToPkgKey } from './epm/registry';
import { getInstallation } from './epm/packages';
import { ensurePackagesCompletedInstall } from './epm/packages/install';
import { bulkInstallPackages } from './epm/packages/bulk_install_packages';
import { agentPolicyService, addPackageToAgentPolicy } from './agent_policy';

interface PreconfigurationResult {
  policies: Array<{ id: string; updated_at: string }>;
  packages: string[];
  nonFatalErrors?: PreconfigurationError[];
}

export type InputsOverride = Partial<NewPackagePolicyInput> & {
  vars?: Array<NewPackagePolicyInput['vars'] & { name: string }>;
};

export async function ensurePreconfiguredPackagesAndPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policies: PreconfiguredAgentPolicy[] = [],
  packages: PreconfiguredPackage[] = [],
  defaultOutput: Output
): Promise<PreconfigurationResult> {
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

  // Preinstall packages specified in Kibana config
  const preconfiguredPackages = await bulkInstallPackages({
    savedObjectsClient: soClient,
    esClient,
    packagesToInstall: packages.map((pkg) =>
      pkg.version === PRECONFIGURATION_LATEST_KEYWORD ? pkg.name : pkg
    ),
    force: true, // Always force outdated packages to be installed if a later version isn't installed
  });

  const fulfilledPackages = [];
  const rejectedPackages = [];
  for (let i = 0; i < preconfiguredPackages.length; i++) {
    const packageResult = preconfiguredPackages[i];
    if ('error' in packageResult)
      rejectedPackages.push({
        package: { name: packages[i].name, version: packages[i].version },
        error: packageResult.error,
      } as PreconfigurationError);
    else fulfilledPackages.push(packageResult);
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
        const preconfigurationId = String(preconfiguredAgentPolicy.id);
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

      if (!created) return { created, policy };
      const { package_policies: packagePolicies } = preconfiguredAgentPolicy;

      const installedPackagePolicies = await Promise.all(
        packagePolicies.map(async ({ package: pkg, name, ...newPackagePolicy }) => {
          const installedPackage = await getInstallation({
            savedObjectsClient: soClient,
            pkgName: pkg.name,
          });
          if (!installedPackage) {
            throw new Error(
              i18n.translate('xpack.fleet.preconfiguration.packageMissingError', {
                defaultMessage:
                  '{agentPolicyName} could not be added. {pkgName} is not installed, add {pkgName} to `{packagesConfigValue}` or remove it from {packagePolicyName}.',
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

      return {
        created,
        policy,
        installedPackagePolicies,
        shouldAddIsManagedFlag: preconfiguredAgentPolicy.is_managed,
      };
    })
  );

  const fulfilledPolicies = [];
  const rejectedPolicies = [];
  for (let i = 0; i < preconfiguredPolicies.length; i++) {
    const policyResult = preconfiguredPolicies[i];
    if (policyResult.status === 'rejected') {
      rejectedPolicies.push({
        error: policyResult.reason as Error,
        agentPolicy: { name: policies[i].name },
      } as PreconfigurationError);
      continue;
    }
    fulfilledPolicies.push(policyResult.value);
    const {
      created,
      policy,
      installedPackagePolicies,
      shouldAddIsManagedFlag,
    } = policyResult.value;
    if (created) {
      await addPreconfiguredPolicyPackages(
        soClient,
        esClient,
        policy!,
        installedPackagePolicies!,
        defaultOutput
      );
      // Add the is_managed flag after configuring package policies to avoid errors
      if (shouldAddIsManagedFlag) {
        agentPolicyService.update(soClient, esClient, policy!.id, { is_managed: true });
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
    packages: fulfilledPackages.map((pkg) => pkgToPkgKey(pkg)),
    nonFatalErrors: [...rejectedPackages, ...rejectedPolicies],
  };
}

async function addPreconfiguredPolicyPackages(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  installedPackagePolicies: Array<
    Partial<Omit<NewPackagePolicy, 'inputs'>> & {
      name: string;
      installedPackage: Installation;
      inputs?: InputsOverride[];
    }
  >,
  defaultOutput: Output
) {
  // Add packages synchronously to avoid overwriting
  for (const { installedPackage, name, description, inputs } of installedPackagePolicies) {
    await addPackageToAgentPolicy(
      soClient,
      esClient,
      installedPackage,
      agentPolicy,
      defaultOutput,
      name,
      description,
      (policy) => overridePackageInputs(policy, inputs)
    );
  }
}

function overridePackageInputs(
  basePackagePolicy: NewPackagePolicy,
  inputsOverride?: InputsOverride[]
) {
  if (!inputsOverride) return basePackagePolicy;

  const inputs = [...basePackagePolicy.inputs];
  const packageName = basePackagePolicy.package!.name;

  for (const override of inputsOverride) {
    const originalInput = inputs.find((i) => i.type === override.type);
    if (!originalInput) {
      const e = {
        error: new Error(
          i18n.translate('xpack.fleet.packagePolicyInputOverrideError', {
            defaultMessage: 'Input type {inputType} does not exist on package {packageName}',
            values: {
              inputType: override.type,
              packageName,
            },
          })
        ),
        package: { name: packageName, version: basePackagePolicy.package!.version },
      };
      throw e;
    }

    if (typeof override.enabled !== 'undefined') originalInput.enabled = override.enabled;

    if (override.vars) {
      try {
        deepMergeVars(override, originalInput);
      } catch (e) {
        const err = {
          error: new Error(
            i18n.translate('xpack.fleet.packagePolicyVarOverrideError', {
              defaultMessage:
                'Var {varName} does not exist on {inputType} of package {packageName}',
              values: {
                varName: e.message,
                inputType: override.type,
                packageName,
              },
            })
          ),
          package: { name: packageName, version: basePackagePolicy.package!.version },
        };
        throw err;
      }
    }

    if (override.streams) {
      for (const stream of override.streams) {
        const originalStream = originalInput.streams.find(
          (s) => s.data_stream.dataset === stream.data_stream.dataset
        );
        if (!originalStream) {
          const e = {
            error: new Error(
              i18n.translate('xpack.fleet.packagePolicyStreamOverrideError', {
                defaultMessage:
                  'Data stream {streamSet} does not exist on {inputType} of package {packageName}',
                values: {
                  streamSet: stream.data_stream.dataset,
                  inputType: override.type,
                  packageName,
                },
              })
            ),
            package: { name: packageName, version: basePackagePolicy.package!.version },
          };
          throw e;
        }

        if (typeof stream.enabled !== 'undefined') originalStream.enabled = stream.enabled;

        if (stream.vars) {
          try {
            deepMergeVars(stream as InputsOverride, originalStream);
          } catch (e) {
            const err = {
              error: new Error(
                i18n.translate('xpack.fleet.packagePolicyStreamVarOverrideError', {
                  defaultMessage:
                    'Var {varName} does not exist on {streamSet} for {inputType} of package {packageName}',
                  values: {
                    varName: e.message,
                    streamSet: stream.data_stream.dataset,
                    inputType: override.type,
                    packageName,
                  },
                })
              ),
              package: { name: packageName, version: basePackagePolicy.package!.version },
            };
            throw err;
          }
        }
      }
    }
  }

  return { ...basePackagePolicy, inputs };
}

function deepMergeVars(
  override: InputsOverride,
  original: NewPackagePolicyInput | NewPackagePolicyInputStream
) {
  for (const { name, ...val } of override.vars!) {
    if (!original.vars || !Reflect.has(original.vars, name)) {
      throw new Error(name);
    }
    const originalVar = original.vars[name];
    Reflect.set(original.vars, name, { ...originalVar, ...val });
  }
}
