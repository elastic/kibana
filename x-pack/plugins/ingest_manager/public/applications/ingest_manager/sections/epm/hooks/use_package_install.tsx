/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';
import { PackageInfo } from '../../../types';
import { sendInstallPackage, sendRemovePackage } from '../../../hooks';
import { InstallStatus } from '../../../types';

interface PackagesInstall {
  [key: string]: PackageInstallItem;
}

interface PackageInstallItem {
  status: InstallStatus;
}

type InstallPackageProps = Pick<PackageInfo, 'name' | 'version' | 'title'>;

function usePackageInstall({ notifications }: { notifications: NotificationsStart }) {
  const [packages, setPackage] = useState<PackagesInstall>({});

  const setPackageInstallStatus = useCallback(
    ({ name, status }: { name: PackageInfo['name']; status: InstallStatus }) => {
      setPackage((prev: PackagesInstall) => ({
        ...prev,
        [name]: { status },
      }));
    },
    []
  );

  const installPackage = useCallback(
    async ({ name, version, title }: InstallPackageProps) => {
      setPackageInstallStatus({ name, status: InstallStatus.installing });
      const pkgkey = `${name}-${version}`;

      const res = await sendInstallPackage(pkgkey);
      if (res.error) {
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled });
        notifications.toasts.addWarning({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageInstallErrorTitle"
              defaultMessage="Failed to install {title} package"
              values={{ title }}
            />
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageInstallErrorDescription"
              defaultMessage="Something went wrong while trying to install this package. Please try again later."
            />
          ),
          iconType: 'alert',
        });
      } else {
        setPackageInstallStatus({ name, status: InstallStatus.installed });

        notifications.toasts.addSuccess({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageInstallSuccessTitle"
              defaultMessage="Installed {title}"
              values={{ title }}
            />
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageInstallSuccessDescription"
              defaultMessage="Successfully installed {title}"
              values={{ title }}
            />
          ),
        });
      }
    },
    [notifications.toasts, setPackageInstallStatus]
  );

  const getPackageInstallStatus = useCallback(
    (pkg: string): InstallStatus => {
      return packages[pkg].status;
    },
    [packages]
  );

  const uninstallPackage = useCallback(
    async ({ name, version, title }: Pick<PackageInfo, 'name' | 'version' | 'title'>) => {
      setPackageInstallStatus({ name, status: InstallStatus.uninstalling });
      const pkgkey = `${name}-${version}`;

      const res = await sendRemovePackage(pkgkey);
      if (res.error) {
        setPackageInstallStatus({ name, status: InstallStatus.installed });
        notifications.toasts.addWarning({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageUninstallErrorTitle"
              defaultMessage="Failed to uninstall {title} package"
              values={{ title }}
            />
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageUninstallErrorDescription"
              defaultMessage="Something went wrong while trying to uninstall this package. Please try again later."
            />
          ),
          iconType: 'alert',
        });
      } else {
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled });

        notifications.toasts.addSuccess({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageUninstallSuccessTitle"
              defaultMessage="Uninstalled {title}"
              values={{ title }}
            />
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.ingestManager.integrations.packageUninstallSuccessDescription"
              defaultMessage="Successfully uninstalled {title}"
              values={{ title }}
            />
          ),
        });
      }
    },
    [notifications.toasts, setPackageInstallStatus]
  );

  return {
    packages,
    installPackage,
    setPackageInstallStatus,
    getPackageInstallStatus,
    uninstallPackage,
  };
}

export const [
  PackageInstallProvider,
  useInstallPackage,
  useSetPackageInstallStatus,
  useGetPackageInstallStatus,
  useUninstallPackage,
] = createContainer(
  usePackageInstall,
  value => value.installPackage,
  value => value.setPackageInstallStatus,
  value => value.getPackageInstallStatus,
  value => value.uninstallPackage
);
