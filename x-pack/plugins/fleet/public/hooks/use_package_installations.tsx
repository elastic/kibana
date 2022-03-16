/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import semverLt from 'semver/functions/lt';

import { installationStatuses } from '../../common/constants';
import type { PackagePolicy } from '../types';

import { useGetPackages } from './use_request/epm';
import { useGetAgentPolicies } from './use_request/agent_policy';

interface UpdatableIntegration {
  currentVersion: string;
  policiesToUpgrade: Array<{
    id: string;
    name: string;
    agentsCount: number;
    pkgPolicyId: string;
    pkgPolicyName: string;
    pkgPolicyIntegrationVersion: string;
  }>;
}

export const usePackageInstallations = () => {
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackages({
    experimental: true,
  });

  const { data: agentPolicyData, isLoading: isLoadingPolicies } = useGetAgentPolicies({
    full: true,
  });

  const allInstalledPackages = useMemo(
    () => (allPackages?.items || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages?.items]
  );

  const updatablePackages = useMemo(
    () =>
      allInstalledPackages.filter(
        (item) =>
          'savedObject' in item && semverLt(item.savedObject.attributes.version, item.version)
      ),
    [allInstalledPackages]
  );

  const updatableIntegrations = useMemo<Map<string, UpdatableIntegration>>(
    () =>
      (agentPolicyData?.items || []).reduce((result, policy) => {
        policy.package_policies.forEach((pkgPolicy: PackagePolicy | string) => {
          if (typeof pkgPolicy === 'string' || !pkgPolicy.package) return false;
          const { name, version } = pkgPolicy.package;
          const installedPackage = allInstalledPackages.find(
            (installedPkg) =>
              'savedObject' in installedPkg && installedPkg.savedObject.attributes.name === name
          );
          if (
            installedPackage &&
            'savedObject' in installedPackage &&
            semverLt(version, installedPackage.savedObject.attributes.version)
          ) {
            const packageData = result.get(name) ?? {
              currentVersion: installedPackage.savedObject.attributes.version,
              policiesToUpgrade: [],
            };
            packageData.policiesToUpgrade.push({
              id: policy.id,
              name: policy.name,
              agentsCount: policy.agents ?? 0,
              pkgPolicyId: pkgPolicy.id,
              pkgPolicyName: pkgPolicy.name,
              pkgPolicyIntegrationVersion: version,
            });
            result.set(name, packageData);
          }
        });
        return result;
      }, new Map<string, UpdatableIntegration>()),
    [allInstalledPackages, agentPolicyData]
  );

  return {
    allPackages,
    allInstalledPackages,
    updatablePackages,
    updatableIntegrations,
    isLoadingPackages,
    isLoadingPolicies,
  };
};
