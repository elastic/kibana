/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';
import { useAuthz, useInstallKibanaAssetsMutation } from '../../../../../hooks';

type InstallKibanaAssetsButtonProps = Pick<PackageInfo, 'name' | 'title' | 'version'>;

export function InstallKibanaAssetsButton(props: InstallKibanaAssetsButtonProps) {
  const { name, title, version } = props;
  const canInstallPackages = useAuthz().integrations.installPackages;
  const { mutateAsync, isLoading } = useInstallKibanaAssetsMutation();

  const handleClickInstall = useCallback(async () => {
    await mutateAsync({
      pkgName: name,
      pkgVersion: version,
    });
  }, [mutateAsync, name, version]);

  if (!canInstallPackages) {
    return null;
  }

  return (
    <EuiButton iconType="refresh" isLoading={isLoading} onClick={handleClickInstall}>
      {isLoading ? (
        <FormattedMessage
          id="xpack.fleet.integrations.installPackage.kibanaAssetsInstallingButtonLabel"
          defaultMessage="Installing {title}"
          values={{
            title,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integrations.installPackage.kibanaAssetsInstallButtonLabel"
          defaultMessage="Install {title}"
          values={{
            title,
          }}
        />
      )}
    </EuiButton>
  );
}
