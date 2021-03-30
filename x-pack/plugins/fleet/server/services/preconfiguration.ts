/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';

import type {
  PackagePolicyPackage,
  NewPackagePolicy,
  AgentPolicy,
  Installation,
  Output,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PreconfiguredAgentPolicy,
} from '../../common';

import { getInstallation } from './epm/packages';
import { ensureInstalledPackage } from './epm/packages/install';
import { agentPolicyService, addPackageToAgentPolicy } from './agent_policy';

export type InputsOverride = Partial<NewPackagePolicyInput> & {
  vars?: Array<NewPackagePolicyInput['vars'] & { name: string }>;
};

export async function ensurePreconfiguredPackagesAndPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policies: PreconfiguredAgentPolicy[] = [],
  packages: Array<Omit<PackagePolicyPackage, 'title'>> = [],
  defaultOutput: Output
) {
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
      .map(([, versions]) => versions.map((v) => `${v.name}:${v.version}`).join(', '))
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
  const preconfiguredPackages = await Promise.all(
    packages.map(({ name, version }) =>
      ensureInstalledPreconfiguredPackage(soClient, esClient, name, version)
    )
  );

  // Create policies specified in Kibana config
  const preconfiguredPolicies = await Promise.all(
    policies.map(async (preconfiguredAgentPolicy) => {
      const { created, policy } = await agentPolicyService.ensurePreconfiguredAgentPolicy(
        soClient,
        esClient,
        preconfiguredAgentPolicy
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

      return { created, policy, installedPackagePolicies };
    })
  );

  for (const preconfiguredPolicy of preconfiguredPolicies) {
    const { created, policy, installedPackagePolicies } = preconfiguredPolicy;
    if (created) {
      await addPreconfiguredPolicyPackages(
        soClient,
        esClient,
        policy,
        installedPackagePolicies!,
        defaultOutput
      );
    }
  }

  return {
    policies: preconfiguredPolicies.map((p) => ({
      id: p.policy.id,
      updated_at: p.policy.updated_at,
    })),
    packages: preconfiguredPackages.map((pkg) => `${pkg.name}:${pkg.version}`),
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
  return await Promise.all(
    installedPackagePolicies.map(async ({ installedPackage, name, description, inputs }) =>
      addPackageToAgentPolicy(
        soClient,
        esClient,
        installedPackage,
        agentPolicy,
        defaultOutput,
        name,
        description,
        (policy) => overridePackageInputs(policy, inputs)
      )
    )
  );
}

async function ensureInstalledPreconfiguredPackage(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  pkgName: string,
  pkgVersion: string
) {
  return ensureInstalledPackage({
    savedObjectsClient: soClient,
    pkgName,
    esClient,
    pkgVersion,
  });
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
      throw new Error(
        i18n.translate('xpack.fleet.packagePolicyInputOverrideError', {
          defaultMessage: 'Input type {inputType} does not exist on package {packageName}',
          values: {
            inputType: override.type,
            packageName,
          },
        })
      );
    }

    if (typeof override.enabled !== 'undefined') originalInput.enabled = override.enabled;

    if (override.vars) {
      try {
        deepMergeVars(override, originalInput);
      } catch (e) {
        throw new Error(
          i18n.translate('xpack.fleet.packagePolicyVarOverrideError', {
            defaultMessage: 'Var {varName} does not exist on {inputType} of package {packageName}',
            values: {
              varName: e.message,
              inputType: override.type,
              packageName,
            },
          })
        );
      }
    }

    if (override.streams) {
      for (const stream of override.streams) {
        const originalStream = originalInput.streams.find(
          (s) => s.data_stream.dataset === stream.data_stream.dataset
        );
        if (!originalStream) {
          throw new Error(
            i18n.translate('xpack.fleet.packagePolicyStreamOverrideError', {
              defaultMessage:
                'Data stream {streamSet} does not exist on {inputType} of package {packageName}',
              values: {
                streamSet: stream.data_stream.dataset,
                inputType: override.type,
                packageName,
              },
            })
          );
        }

        if (typeof stream.enabled !== 'undefined') originalStream.enabled = stream.enabled;

        if (stream.vars) {
          try {
            deepMergeVars(stream as InputsOverride, originalStream);
          } catch (e) {
            throw new Error(
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
            );
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
