/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsMutating } from '@tanstack/react-query';
import { useEffect } from 'react';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../common/detection_engine/constants';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { KibanaServices, useKibana } from '../../../common/lib/kibana';
import type { BulkInstallFleetPackagesProps, InstallFleetPackageProps } from '../api/api';
import {
  BULK_INSTALL_FLEET_PACKAGES_MUTATION_KEY,
  useBulkInstallFleetPackagesMutation,
} from '../api/hooks/use_bulk_install_fleet_packages_mutation';
import {
  INSTALL_FLEET_PACKAGE_MUTATION_KEY,
  useInstallFleetPackageMutation,
} from '../api/hooks/use_install_fleet_package_mutation';

/**
 * Install or upgrade the security packages (endpoint and prebuilt rules)
 */
export const useUpgradeSecurityPackages = () => {
  const context = useKibana();
  const canAccessFleet = useUserPrivileges().endpointPrivileges.canAccessFleet;
  const { mutate: bulkInstallFleetPackages } = useBulkInstallFleetPackagesMutation();
  const { mutate: installFleetPackage } = useInstallFleetPackageMutation();

  useEffect(() => {
    if (!canAccessFleet) {
      return;
    }

    (async () => {
      // Make sure fleet is initialized first
      await context.services.fleet?.isInitialized();

      // Install the latest prerelease if in non-production non-serverless environments
      const prerelease =
        KibanaServices.getBuildFlavor() === 'traditional' &&
        (KibanaServices.getKibanaVersion().includes('-SNAPSHOT') ||
          KibanaServices.getKibanaBranch() === 'main');

      const prebuiltRulesPackageVersion = KibanaServices.getPrebuiltRulesPackageVersion();
      // ignore the response for now since we aren't notifying the user
      const packages = ['endpoint', PREBUILT_RULES_PACKAGE_NAME];

      // If `prebuiltRulesPackageVersion` is provided, try to install that version
      // Must be done as two separate requests as bulk API doesn't support versions
      if (prebuiltRulesPackageVersion != null) {
        installFleetPackage({
          packageName: PREBUILT_RULES_PACKAGE_NAME,
          packageVersion: prebuiltRulesPackageVersion,
          prerelease,
          force: true,
        });
        packages.splice(packages.indexOf(PREBUILT_RULES_PACKAGE_NAME), 1);
      }

      // Note: if `prerelease:true` option is provided, endpoint package will also be installed as prerelease
      bulkInstallFleetPackages({
        packages,
        prerelease,
      });
    })();
  }, [bulkInstallFleetPackages, canAccessFleet, context.services.fleet, installFleetPackage]);
};

/**
 * @returns true if the security packages are being installed or upgraded
 */
export const useIsUpgradingSecurityPackages = () => {
  const isInstallingPackages = useIsMutating({
    predicate: ({ options: { mutationKey }, state: { variables } }) => {
      // The mutation is bulk Fleet packages installation. Check if the packages include the prebuilt rules package
      if (mutationKey === BULK_INSTALL_FLEET_PACKAGES_MUTATION_KEY) {
        return (variables as BulkInstallFleetPackagesProps).packages.includes(
          PREBUILT_RULES_PACKAGE_NAME
        );
      }

      // The mutation is single Fleet package installation. Check if the package is the prebuilt rules package
      if (mutationKey === INSTALL_FLEET_PACKAGE_MUTATION_KEY) {
        return (variables as InstallFleetPackageProps).packageName === PREBUILT_RULES_PACKAGE_NAME;
      }
      return false;
    },
  });

  return isInstallingPackages > 0;
};
