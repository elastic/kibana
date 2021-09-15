/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import {
  useCapabilities,
  useGetPackageInstallStatus,
  useInstallPackage,
} from '../../../../../hooks';

import { ConfirmPackageInstall } from './confirm_package_install';

/*

  TODO: Move this

  This component defines the logic for two mutative operations related to integrations:

  1. Installing a currently-uninstalled integration
  2. Updating an installed integration to a new version

  Installing a new integration is straightforward. We display a confirmation modal and make an API call to install
  the package upon confirmation.

  Updating an integration to a new version entails a bit more logic. We allow the user to choose whether they'd like to
  simultaneously upgrade any package policies that include the current version of the integration. For example, if
  a user is running four agent policies that include the `nginx-0.2.4` package and they update to `nginx-0.7.0`, they
  can elect to also deploy the new integration version to any agent running one of those four agent policies.

  If the user does not elect to upgrade their running policies, we simply install the latest version of the package and
  navigate to the new version's settings page, e.g. `/detail/nginx-0.7.0/settings`.

  If the user _does_ elect to upgrade their running policies, we display a confirmation modal. In this modal, we'll report the
  number of agents and policies that will be affected by the upgrade, and if there are any conflicts. In the case of a conflict
  between versions, an upgrade for a given package policy will be skipped and the user will need to manually recreate their policy
  to resolve any breaking changes between versions. Once the user confirms, we first install the latest version of the integration,
  then we make a call to the "upgrade policies" API endpoint with a list of all package policy ID's that include the current version
  of the integration. This API endpoint will complete the upgrade process in bulk for each package policy provided. Upon completion,
  we navigate to the new version's settings page, as above.

*/

type InstallationButtonProps = Pick<PackageInfo, 'assets' | 'name' | 'title' | 'version'> & {
  disabled?: boolean;
  latestVersion?: string;
  packagePolicyIds?: string[];
  dryRunData?: UpgradePackagePolicyDryRunResponse | null;
  isUpgradingPackagePolicies?: boolean;
  setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
};
export function InstallationButton(props: InstallationButtonProps) {
  const { assets, name, title, version } = props;
  const hasWriteCapabilites = useCapabilities().write;
  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);

  const isInstalling = installationStatus === InstallStatus.installing;
  const [isInstallModalVisible, setIsInstallModalVisible] = useState<boolean>(false);

  const toggleInstallModal = useCallback(() => {
    setIsInstallModalVisible(!isInstallModalVisible);
  }, [isInstallModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleInstallModal();
  }, [installPackage, name, title, toggleInstallModal, version]);

  // counts the number of assets in the package
  const numOfAssets = useMemo(
    () =>
      Object.entries(assets).reduce(
        (acc, [serviceName, serviceNameValue]) =>
          acc +
          Object.entries(serviceNameValue).reduce(
            (acc2, [assetName, assetNameValue]) => acc2 + assetNameValue.length,
            0
          ),
        0
      ),
    [assets]
  );

  const installModal = (
    <ConfirmPackageInstall
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleInstallModal}
      onConfirm={handleClickInstall}
    />
  );

  return hasWriteCapabilites ? (
    <Fragment>
      <EuiButton iconType={'importAction'} isLoading={isInstalling} onClick={toggleInstallModal}>
        {isInstalling ? (
          <FormattedMessage
            id="xpack.fleet.integrations.installPackage.installingPackageButtonLabel"
            defaultMessage="Installing {title} assets"
            values={{
              title,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.integrations.installPackage.installPackageButtonLabel"
            defaultMessage="Install {title} assets"
            values={{
              title,
            }}
          />
        )}
      </EuiButton>

      {isInstallModalVisible && installModal}
    </Fragment>
  ) : null;
}
