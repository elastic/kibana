/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { Fragment, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import { useAuthz, useGetPackageInstallStatus, useInstallPackage } from '../../../../../hooks';

type ReinstallationButtonProps = Pick<PackageInfo, 'name' | 'title' | 'version'>;
export function ReinstallButton(props: ReinstallationButtonProps) {
  const { name, title, version } = props;
  const canInstallPackages = useAuthz().integrations.installPackages;
  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);

  const isReinstalling = installationStatus === InstallStatus.reinstalling;

  const handleClickReinstall = useCallback(() => {
    installPackage({ name, version, title, isReinstall: true });
  }, [installPackage, name, title, version]);

  return canInstallPackages ? (
    <Fragment>
      <EuiButton iconType="refresh" isLoading={isReinstalling} onClick={handleClickReinstall}>
        {isReinstalling ? (
          <FormattedMessage
            id="xpack.fleet.integrations.installPackage.reinstallingPackageButtonLabel"
            defaultMessage="Reinstalling {title}"
            values={{
              title,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.integrations.installPackage.reinstallPackageButtonLabel"
            defaultMessage="Reinstall {title}"
            values={{
              title,
            }}
          />
        )}
      </EuiButton>
    </Fragment>
  ) : null;
}
