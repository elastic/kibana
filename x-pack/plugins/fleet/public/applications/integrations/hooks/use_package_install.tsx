/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NotificationsStart } from 'src/core/public';
import type { Observable } from 'rxjs';
import type { CoreTheme } from 'kibana/public';

import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import type { PackageInfo } from '../../../types';
import { sendInstallPackage, sendRemovePackage, useLink } from '../../../hooks';
import { InstallStatus } from '../../../types';

interface PackagesInstall {
  [key: string]: PackageInstallItem;
}

interface PackageInstallItem {
  status: InstallStatus;
  version: string | null;
}

type InstallPackageProps = Pick<PackageInfo, 'name' | 'version' | 'title'> & {
  fromUpdate?: boolean;
};
type SetPackageInstallStatusProps = Pick<PackageInfo, 'name'> & PackageInstallItem;

function usePackageInstall({
  notifications,
  theme$,
}: {
  notifications: NotificationsStart;
  theme$: Observable<CoreTheme>;
}) {
  const history = useHistory();
  const { getPath } = useLink();
  const [packages, setPackage] = useState<PackagesInstall>({});

  const setPackageInstallStatus = useCallback(
    ({ name, status, version }: SetPackageInstallStatusProps) => {
      const packageProps: PackageInstallItem = {
        status,
        version,
      };
      setPackage((prev: PackagesInstall) => ({
        ...prev,
        [name]: packageProps,
      }));
    },
    []
  );

  const getPackageInstallStatus = useCallback(
    (pkg: string): PackageInstallItem => {
      return packages[pkg];
    },
    [packages]
  );

  const installPackage = useCallback(
    async ({ name, version, title, fromUpdate = false }: InstallPackageProps) => {
      const currStatus = getPackageInstallStatus(name);
      const newStatus = { ...currStatus, name, status: InstallStatus.installing };
      setPackageInstallStatus(newStatus);

      const res = await sendInstallPackage(name, version);
      if (res.error) {
        if (fromUpdate) {
          // if there is an error during update, set it back to the previous version
          // as handling of bad update is not implemented yet
          setPackageInstallStatus({ ...currStatus, name });
        } else {
          setPackageInstallStatus({ name, status: InstallStatus.notInstalled, version });
        }
        notifications.toasts.addWarning({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageInstallErrorTitle"
              defaultMessage="Failed to install {title} package"
              values={{ title }}
            />,
            { theme$ }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageInstallErrorDescription"
              defaultMessage="Something went wrong while trying to install this package. Please try again later."
            />,
            { theme$ }
          ),
          iconType: 'alert',
        });
      } else {
        setPackageInstallStatus({ name, status: InstallStatus.installed, version });
        if (fromUpdate) {
          const settingsPath = getPath('integration_details_settings', {
            pkgkey: `${name}-${version}`,
          });
          history.push(settingsPath);
        }

        notifications.toasts.addSuccess({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageInstallSuccessTitle"
              defaultMessage="Installed {title}"
              values={{ title }}
            />,
            { theme$ }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageInstallSuccessDescription"
              defaultMessage="Successfully installed {title}"
              values={{ title }}
            />,
            { theme$ }
          ),
        });
      }
    },
    [
      getPackageInstallStatus,
      notifications.toasts,
      setPackageInstallStatus,
      getPath,
      history,
      theme$,
    ]
  );

  const uninstallPackage = useCallback(
    async ({
      name,
      version,
      title,
      redirectToVersion,
    }: Pick<PackageInfo, 'name' | 'version' | 'title'> & { redirectToVersion: string }) => {
      setPackageInstallStatus({ name, status: InstallStatus.uninstalling, version });

      const res = await sendRemovePackage(name, version);
      if (res.error) {
        setPackageInstallStatus({ name, status: InstallStatus.installed, version });
        notifications.toasts.addWarning({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageUninstallErrorTitle"
              defaultMessage="Failed to uninstall {title} package"
              values={{ title }}
            />,
            { theme$ }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageUninstallErrorDescription"
              defaultMessage="Something went wrong while trying to uninstall this package. Please try again later."
            />,
            { theme$ }
          ),
          iconType: 'alert',
        });
      } else {
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled, version: null });

        notifications.toasts.addSuccess({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageUninstallSuccessTitle"
              defaultMessage="Uninstalled {title}"
              values={{ title }}
            />,
            { theme$ }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.integrations.packageUninstallSuccessDescription"
              defaultMessage="Successfully uninstalled {title}"
              values={{ title }}
            />,
            { theme$ }
          ),
        });
        if (redirectToVersion !== version) {
          const settingsPath = getPath('integration_details_settings', {
            pkgkey: `${name}-${redirectToVersion}`,
          });
          history.push(settingsPath);
        }
      }
    },
    [notifications.toasts, setPackageInstallStatus, getPath, history, theme$]
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
  (value) => value.installPackage,
  (value) => value.setPackageInstallStatus,
  (value) => value.getPackageInstallStatus,
  (value) => value.uninstallPackage
);
