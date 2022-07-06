/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { isVerificationError } from '../../../../../../../services';

import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import { useAuthz, useGetPackageInstallStatus, useInstallPackage } from '../../../../../hooks';

import { UnverifiedPackageModal } from '../../../components/unverified_package_modal';

import { ConfirmPackageInstall } from './confirm_package_install';
type InstallationButtonProps = Pick<PackageInfo, 'name' | 'title' | 'version'> & {
  disabled?: boolean;
  dryRunData?: UpgradePackagePolicyDryRunResponse | null;
  isUpgradingPackagePolicies?: boolean;
  latestVersion?: string;
  numOfAssets: number;
  packagePolicyIds?: string[];
  setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
};
export function InstallButton(props: InstallationButtonProps) {
  const { name, numOfAssets, title, version } = props;
  const canInstallPackages = useAuthz().integrations.installPackages;
  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus, error: installationError } = getPackageInstallStatus(name);

  const isInstalling = installationStatus === InstallStatus.installing;
  const [isInstallModalVisible, setIsInstallModalVisible] = useState<boolean>(false);
  const [isUnverifiedModalVisible, setIsUnverifiedModalVisible] = useState<boolean>(false);

  useMemo(() => {
    if (isVerificationError(installationError)) {
      setIsUnverifiedModalVisible(true);
    }
  }, [installationError]);

  const toggleInstallModal = useCallback(() => {
    setIsInstallModalVisible(!isInstallModalVisible);
  }, [isInstallModalVisible]);
  const toggleUnverifiedModal = useCallback(() => {
    setIsInstallModalVisible(!isUnverifiedModalVisible);
  }, [isUnverifiedModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleInstallModal();
  }, [installPackage, name, title, toggleInstallModal, version]);

  const handleClickForceInstall = useCallback(() => {
    installPackage({ name, version, title, force: true });
    toggleUnverifiedModal();
  }, [installPackage, name, title, toggleUnverifiedModal, version]);

  const installModal = (
    <ConfirmPackageInstall
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleInstallModal}
      onConfirm={handleClickInstall}
    />
  );

  const unverifiedModal = (
    <UnverifiedPackageModal onConfirm={handleClickForceInstall} onCancel={toggleUnverifiedModal} />
  );

  return canInstallPackages ? (
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
      {isUnverifiedModalVisible && unverifiedModal}
    </Fragment>
  ) : null;
}
