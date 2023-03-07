/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import semverLt from 'semver/functions/lt';

import { installationStatuses } from '../../common/constants';
import type { PackagePolicy } from '../types';

import { useGetPackages } from './use_request/epm';

export const useIsPackagePolicyUpgradable = () => {
  const { data: allPackages, isLoading: isLoadingPackages } = useGetPackages({
    prerelease: true,
  });

  const allInstalledPackages = useMemo(
    () => (allPackages?.items || []).filter((pkg) => pkg.status === installationStatuses.Installed),
    [allPackages?.items]
  );

  const isPackagePolicyUpgradable = useCallback(
    (pkgPolicy: PackagePolicy) => {
      if (!pkgPolicy.package) {
        return false;
      }
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
        return true;
      }
      return false;
    },
    [allInstalledPackages]
  );

  return {
    isPackagePolicyUpgradable,
    isLoadingPackages,
  };
};
