/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton } from '@elastic/eui';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { PackageInfo, InstallStatus } from '../../../../types';
import { useCapabilities } from '../../../../hooks';
import { useUninstallPackage, useGetPackageInstallStatus, useInstallPackage } from '../../hooks';
import { ConfirmPackageUninstall } from './confirm_package_uninstall';
import { ConfirmPackageInstall } from './confirm_package_install';

type InstallationButtonProps = Pick<PackageInfo, 'assets' | 'name' | 'title' | 'version'> & {
  disabled?: boolean;
  isUpdate?: boolean;
};
export function InstallationButton(props: InstallationButtonProps) {
  const { assets, name, title, version, disabled = true, isUpdate = false } = props;
  const hasWriteCapabilites = useCapabilities().write;
  const installPackage = useInstallPackage();
  const uninstallPackage = useUninstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);

  const isInstalling = installationStatus === InstallStatus.installing;
  const isRemoving = installationStatus === InstallStatus.uninstalling;
  const isInstalled = installationStatus === InstallStatus.installed;
  const showUninstallButton = isInstalled || isRemoving;
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const toggleModal = useCallback(() => {
    setModalVisible(!isModalVisible);
  }, [isModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleModal();
  }, [installPackage, name, title, toggleModal, version]);

  const handleClickUpdate = useCallback(() => {
    installPackage({ name, version, title, fromUpdate: true });
  }, [installPackage, name, title, version]);

  const handleClickUninstall = useCallback(() => {
    uninstallPackage({ name, version, title });
    toggleModal();
  }, [uninstallPackage, name, title, toggleModal, version]);

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

  const installButton = (
    <EuiButton iconType={'importAction'} isLoading={isInstalling} onClick={toggleModal}>
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
  );

  const updateButton = (
    <EuiButton iconType={'refresh'} isLoading={isInstalling} onClick={handleClickUpdate}>
      <FormattedMessage
        id="xpack.fleet.integrations.updatePackage.updatePackageButtonLabel"
        defaultMessage="Update to latest version"
      />
    </EuiButton>
  );

  const uninstallButton = (
    <EuiButton
      iconType={'trash'}
      isLoading={isRemoving}
      onClick={toggleModal}
      color="danger"
      disabled={disabled || isRemoving ? true : false}
    >
      {isRemoving ? (
        <FormattedMessage
          id="xpack.fleet.integrations.uninstallPackage.uninstallingPackageButtonLabel"
          defaultMessage="Uninstalling {title}"
          values={{
            title,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integrations.uninstallPackage.uninstallPackageButtonLabel"
          defaultMessage="Uninstall {title}"
          values={{
            title,
          }}
        />
      )}
    </EuiButton>
  );

  const uninstallModal = (
    <ConfirmPackageUninstall
      // this is number of which would be installed
      // deleted includes ingest-pipelines etc so could be larger
      // not sure how to do this at the moment so using same value
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleModal}
      onConfirm={handleClickUninstall}
    />
  );

  const installModal = (
    <ConfirmPackageInstall
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleModal}
      onConfirm={handleClickInstall}
    />
  );

  return hasWriteCapabilites ? (
    <Fragment>
      {isUpdate ? updateButton : showUninstallButton ? uninstallButton : installButton}
      {isModalVisible && (isInstalled ? uninstallModal : installModal)}
    </Fragment>
  ) : null;
}
