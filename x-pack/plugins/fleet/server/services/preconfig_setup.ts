/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';

import { packageToPackagePolicy } from '../../common';

import type {
  NewPackagePolicy,
  AgentPolicy,
  Installation,
  Output,
  InputsOverride,
  FleetConfigType,
} from '../../common';

import { getPackageInfo } from './epm/packages';
import { ensureInstalledPackage, isPackageInstalled } from './epm/packages/install';
import { packagePolicyService } from './package_policy';
import { agentPolicyService } from './agent_policy';

async function ensureInstalledPreconfiguredPackage(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  pkgName: string,
  version: string
) {
  return ensureInstalledPackage({
    savedObjectsClient: soClient,
    pkgName,
    esClient,
    version,
  });
}

export async function ensurePreconfiguredPackagesAndPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  policies: FleetConfigType['agentPolicies'] = [],
  packages: FleetConfigType['packages'] = [],
  defaultOutput: Output
) {
  // Validate configured packages to ensure there are no version conflicts
  const packageNamesByVersion = groupBy(packages, (pkg) => pkg.version);
  const duplicatePackages = Object.entries(packageNamesByVersion).filter(
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
      i18n.translate('xpack.fleet.setup.duplicatePackageError', {
        defaultMessage: 'Duplicate packages specified in configuration: {duplicateList}',
        values: {
          duplicateList,
        },
      })
    );
  }

  // Create policies specified in Kibana config
  const policiesPromise = Promise.all(
    policies.map(async ({ package_policies: packagePolicies, id, ...newAgentPolicy }) => {
      const installedPackagePolicies = await Promise.all(
        packagePolicies.map(async ({ package: pkg, name, ...newPackagePolicy }) => {
          const installedPackage = await isPackageInstalled({
            savedObjectsClient: soClient,
            pkgName: pkg.name,
          });
          if (!installedPackage) {
            throw new Error(
              i18n.translate('xpack.fleet.preconfiguredPackageMissingError', {
                defaultMessage:
                  '{agentPolicyName} could not be added. {pkgName} is not installed, add {pkgName} to `{packagesConfigValue}` or remove it from {packagePolicyName}.',
                values: {
                  agentPolicyName: newAgentPolicy.name,
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

      const { created, policy } = await agentPolicyService.ensurePreconfiguredAgentPolicy(
        soClient,
        esClient,
        { ...newAgentPolicy, preconfiguration_id: String(id) }
      );
      return { created, policy, installedPackagePolicies };
    })
  );

  // Preinstall packages specified in Kibana config
  const packagesPromise = Promise.all(
    packages.map(({ name, version }) =>
      ensureInstalledPreconfiguredPackage(soClient, esClient, name, version)
    )
  );

  const [preconfiguredPolicies] = await Promise.all([policiesPromise, packagesPromise]);

  for (const preconfiguredPolicy of preconfiguredPolicies) {
    const { created, policy, installedPackagePolicies } = preconfiguredPolicy;
    if (created) {
      await addPreconfiguredPolicyPackages(
        soClient,
        esClient,
        policy,
        installedPackagePolicies,
        defaultOutput
      );
    }
  }

  return { initialized: true };
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
        inputs
      )
    )
  );
}

export async function addPackageToAgentPolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packageToInstall: Installation,
  agentPolicy: AgentPolicy,
  defaultOutput: Output,
  packagePolicyName?: string,
  packagePolicyDescription?: string,
  inputsOverride?: InputsOverride[]
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName: packageToInstall.name,
    pkgVersion: packageToInstall.version,
  });

  const newPackagePolicy = packageToPackagePolicy(
    packageInfo,
    agentPolicy.id,
    defaultOutput.id,
    agentPolicy.namespace,
    packagePolicyName,
    packagePolicyDescription,
    inputsOverride
  );

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    bumpRevision: false,
  });
}
