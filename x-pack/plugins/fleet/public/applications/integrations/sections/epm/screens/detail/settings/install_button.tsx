/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { Fragment, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import {
  useCapabilities,
  useGetPackageInstallStatus,
  useInstallPackage,
  useStartServices,
} from '../../../../../hooks';

import { sendPostFleetSetup } from '../../../../../../../hooks/use_request/setup';
import { toMountPoint } from '../../../../../../../../../../../src/plugins/kibana_react/public';

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
  const hasWriteCapabilites = useCapabilities().write;
  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);

  const [isFleetSetupInProgress, setFleetSetupInProgress] = useState<boolean>(false);

  const isInstalling = installationStatus === InstallStatus.installing || isFleetSetupInProgress;
  const [isInstallModalVisible, setIsInstallModalVisible] = useState<boolean>(false);

  const toggleInstallModal = useCallback(() => {
    setIsInstallModalVisible(!isInstallModalVisible);
  }, [isInstallModalVisible]);

  const { notifications } = useStartServices();

  const handleClickInstall = useCallback(async () => {
    setFleetSetupInProgress(true);
    toggleInstallModal();
    try {
      const res = await sendPostFleetSetup({ forceRecreate: false });
      if (res.error) {
        throw res.error;
      }
    } catch (e) {
      notifications.toasts.addWarning({
        title: toMountPoint(
          <FormattedMessage
            id="xpack.fleet.integrations.fleetSetupErrorTitle"
            defaultMessage="Failed to setup Fleet"
          />
        ),
        text: toMountPoint(
          <FormattedMessage
            id="xpack.fleet.integrations.fleetSetupErrorDescription"
            defaultMessage="Something went wrong while trying to setup Fleet. Please try again by navigating to Fleet tab."
          />
        ),
        iconType: 'alert',
      });
    }
    setFleetSetupInProgress(false);
    installPackage({ name, version, title });
  }, [installPackage, name, title, toggleInstallModal, version, notifications.toasts]);

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
