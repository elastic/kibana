/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import React, { useCallback, useState } from 'react';
import { NotificationsStart } from 'kibana/public';
import { useLinks } from '.';
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
  const { toDetailView } = useLinks();

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
          title: `Failed to install ${title} package`,
          text:
            'Something went wrong while trying to install this package. Please try again later.',
          iconType: 'alert',
        });
      } else {
        setPackageInstallStatus({ name, status: InstallStatus.installed });
        const SuccessMsg = <p>Successfully installed {name}</p>;

        notifications.toasts.addSuccess({
          title: `Installed ${title} package`,
          text: toMountPoint(SuccessMsg),
        });

        // TODO: this should probably live somewhere else and use <Redirect />,
        // this hook could return the request state and a component could
        // use that state. the component should be able to unsubscribe to prevent memory leaks
        const packageUrl = toDetailView({ name, version });
        const dataSourcesUrl = toDetailView({
          name,
          version,
          panel: 'data-sources',
          withAppRoot: false,
        });
        if (window.location.href.includes(packageUrl)) window.location.hash = dataSourcesUrl;
      }
    },
    [notifications.toasts, setPackageInstallStatus, toDetailView]
  );

  const getPackageInstallStatus = useCallback(
    (pkg: string): InstallStatus => {
      return packages[pkg].status;
    },
    [packages]
  );

  const deletePackage = useCallback(
    async ({ name, version, title }: Pick<PackageInfo, 'name' | 'version' | 'title'>) => {
      setPackageInstallStatus({ name, status: InstallStatus.uninstalling });
      const pkgkey = `${name}-${version}`;

      const res = await sendRemovePackage(pkgkey);
      if (res.error) {
        setPackageInstallStatus({ name, status: InstallStatus.installed });
        notifications.toasts.addWarning({
          title: `Failed to delete ${title} package`,
          text: 'Something went wrong while trying to delete this package. Please try again later.',
          iconType: 'alert',
        });
      } else {
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled });

        const SuccessMsg = <p>Successfully deleted {title}</p>;

        notifications.toasts.addSuccess({
          title: `Deleted ${title} package`,
          text: toMountPoint(SuccessMsg),
        });

        const packageUrl = toDetailView({ name, version });
        const dataSourcesUrl = toDetailView({
          name,
          version,
          panel: 'data-sources',
        });
        if (window.location.href.includes(packageUrl)) window.location.href = dataSourcesUrl;
      }
    },
    [notifications.toasts, setPackageInstallStatus, toDetailView]
  );

  return {
    packages,
    installPackage,
    setPackageInstallStatus,
    getPackageInstallStatus,
    deletePackage,
  };
}

export const [
  PackageInstallProvider,
  useInstallPackage,
  useSetPackageInstallStatus,
  useGetPackageInstallStatus,
  useDeletePackage,
] = createContainer(
  usePackageInstall,
  value => value.installPackage,
  value => value.setPackageInstallStatus,
  value => value.getPackageInstallStatus,
  value => value.deletePackage
);
