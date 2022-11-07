/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize, flatten } from 'lodash';
import type { PackagePolicy, ArchivePackage } from '@kbn/fleet-plugin/common';
import type {
  InstalledIntegration,
  InstalledIntegrationArray,
  InstalledIntegrationBasicInfo,
  InstalledPackage,
  InstalledPackageArray,
  InstalledPackageBasicInfo,
} from '../../../../../../common/detection_engine/fleet_integrations';

export interface IInstalledIntegrationSet {
  addPackagePolicy(policy: PackagePolicy): void;
  addRegistryPackage(registryPackage: ArchivePackage): void;

  getPackages(): InstalledPackageArray;
  getIntegrations(): InstalledIntegrationArray;
}

type PackageMap = Map<string, PackageInfo>;

interface PackageInfo extends InstalledPackageBasicInfo {
  integrations: Map<string, InstalledIntegrationBasicInfo>;
}

export const createInstalledIntegrationSet = (): IInstalledIntegrationSet => {
  const packageMap: PackageMap = new Map<string, PackageInfo>([]);

  const addPackagePolicy = (policy: PackagePolicy): void => {
    const packageInfo = getPackageInfoFromPolicy(policy);
    const integrationsInfo = getIntegrationsInfoFromPolicy(policy, packageInfo);
    const packageKey = `${packageInfo.package_name}:${packageInfo.package_version}`;
    const existingPackageInfo = packageMap.get(packageKey);

    if (existingPackageInfo == null) {
      const integrationsMap = new Map<string, InstalledIntegrationBasicInfo>();
      integrationsInfo.forEach((integration) => {
        addIntegrationToMap(integrationsMap, integration);
      });

      packageMap.set(packageKey, {
        ...packageInfo,
        integrations: integrationsMap,
      });
    } else {
      integrationsInfo.forEach((integration) => {
        addIntegrationToMap(existingPackageInfo.integrations, integration);
      });
    }
  };

  const addRegistryPackage = (registryPackage: ArchivePackage): void => {
    const policyTemplates = registryPackage.policy_templates ?? [];
    const packageKey = `${registryPackage.name}:${registryPackage.version}`;
    const existingPackageInfo = packageMap.get(packageKey);

    if (existingPackageInfo != null) {
      for (const integration of existingPackageInfo.integrations.values()) {
        const policyTemplate = policyTemplates.find((t) => t.name === integration.integration_name);
        if (policyTemplate != null) {
          integration.integration_title = policyTemplate.title;
        }
      }
    }
  };

  const getPackages = (): InstalledPackageArray => {
    const packages = Array.from(packageMap.values());
    return packages.map((packageInfo): InstalledPackage => {
      const integrations = Array.from(packageInfo.integrations.values());
      return { ...packageInfo, integrations };
    });
  };

  const getIntegrations = (): InstalledIntegrationArray => {
    const packages = Array.from(packageMap.values());
    return flatten(
      packages.map((packageInfo): InstalledIntegrationArray => {
        const integrations = Array.from(packageInfo.integrations.values());
        return integrations.map((integrationInfo): InstalledIntegration => {
          return packageInfo.package_name === integrationInfo.integration_name
            ? {
                package_name: packageInfo.package_name,
                package_title: packageInfo.package_title,
                package_version: packageInfo.package_version,
                is_enabled: integrationInfo.is_enabled,
              }
            : {
                package_name: packageInfo.package_name,
                package_title: packageInfo.package_title,
                package_version: packageInfo.package_version,
                integration_name: integrationInfo.integration_name,
                integration_title: integrationInfo.integration_title,
                is_enabled: integrationInfo.is_enabled,
              };
        });
      })
    );
  };

  return {
    addPackagePolicy,
    addRegistryPackage,
    getPackages,
    getIntegrations,
  };
};

const getPackageInfoFromPolicy = (policy: PackagePolicy): InstalledPackageBasicInfo => {
  return {
    package_name: normalizeString(policy.package?.name),
    package_title: normalizeString(policy.package?.title),
    package_version: normalizeString(policy.package?.version),
  };
};

const getIntegrationsInfoFromPolicy = (
  policy: PackagePolicy,
  packageInfo: InstalledPackageBasicInfo
): InstalledIntegrationBasicInfo[] => {
  return policy.inputs.map((input) => {
    const integrationName = normalizeString(input.policy_template); // e.g. 'cloudtrail'
    const integrationTitle = `${packageInfo.package_title} ${capitalize(integrationName)}`; // e.g. 'AWS Cloudtrail'
    return {
      integration_name: integrationName,
      integration_title: integrationTitle, // title gets re-initialized later in addRegistryPackage()
      is_enabled: input.enabled,
    };
  });
};

const normalizeString = (raw: string | null | undefined): string => {
  return (raw ?? '').trim();
};

const addIntegrationToMap = (
  map: Map<string, InstalledIntegrationBasicInfo>,
  integration: InstalledIntegrationBasicInfo
): void => {
  if (!map.has(integration.integration_name) || integration.is_enabled) {
    map.set(integration.integration_name, integration);
  }
};
