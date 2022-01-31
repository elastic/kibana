/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { InstallStatus } from '../../../../../types';
import type { PackageInfo } from '../../../../../types';

import { useAuthz, useGetPackageInstallStatus, useUninstallPackage } from '../../../../../hooks';

import { ConfirmPackageUninstall } from './confirm_package_uninstall';

interface UninstallButtonProps extends Pick<PackageInfo, 'name' | 'title' | 'version'> {
  disabled?: boolean;
  latestVersion?: string;
  numOfAssets: number;
}

export const UninstallButton: React.FunctionComponent<UninstallButtonProps> = ({
  disabled = false,
  latestVersion,
  name,
  numOfAssets,
  title,
  version,
}) => {
  const canRemovePackages = useAuthz().integrations.removePackages;
  const uninstallPackage = useUninstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);
  const isRemoving = installationStatus === InstallStatus.uninstalling;

  const [isUninstallModalVisible, setIsUninstallModalVisible] = useState<boolean>(false);

  const handleClickUninstall = useCallback(() => {
    uninstallPackage({ name, version, title, redirectToVersion: latestVersion ?? version });
    setIsUninstallModalVisible(false);
  }, [uninstallPackage, name, title, version, latestVersion]);

  const uninstallModal = (
    <ConfirmPackageUninstall
      // this is number of which would be installed
      // deleted includes ingest-pipelines etc so could be larger
      // not sure how to do this at the moment so using same value
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={() => setIsUninstallModalVisible(false)}
      onConfirm={handleClickUninstall}
    />
  );

  return canRemovePackages ? (
    <>
      <EuiButton
        iconType={'trash'}
        isLoading={isRemoving}
        onClick={() => setIsUninstallModalVisible(true)}
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
      {isUninstallModalVisible && uninstallModal}
    </>
  ) : null;
};
