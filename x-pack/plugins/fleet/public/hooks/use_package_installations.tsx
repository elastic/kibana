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

import { useGetPackagesQuery } from './use_request/epm';
import { useGetAgentPoliciesQuery } from './use_request/agent_policy';

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

export const usePackageInstallationsQuery = () => {
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackagesQuery({
    prerelease: true,
  });

  const { data: agentPolicyData, isLoading: isLoadingPolicies } = useGetAgentPoliciesQuery({
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
          'installationInfo' in item &&
          item.installationInfo?.version &&
          semverLt(item.installationInfo.version, item.version)
      ),
    [allInstalledPackages]
  );

  const updatableIntegrations = useMemo<Map<string, UpdatableIntegration>>(
    () =>
      (agentPolicyData?.items || []).reduce((result, policy) => {
        policy.package_policies?.forEach((pkgPolicy: PackagePolicy) => {
          if (!pkgPolicy.package) return false;
          const { name, version } = pkgPolicy.package;
          const installedPackage = allInstalledPackages.find(
            (installedPkg) =>
              'installationInfo' in installedPkg && installedPkg?.installationInfo?.name === name
          );
          if (
            installedPackage &&
            'installationInfo' in installedPackage &&
            installedPackage?.installationInfo?.version &&
            semverLt(version, installedPackage.installationInfo.version)
          ) {
            const packageData = result.get(name) ?? {
              currentVersion: installedPackage.installationInfo.version,
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
